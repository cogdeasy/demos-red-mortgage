import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { CreditCheckService } from '../../src/services/credit-check-service';
import { ApplicationService } from '../../src/services/application-service';
import { getRiskBand } from '../../src/models/credit-check';
import { ConflictError } from '../../src/errors';

/**
 * E2E tests for the full credit check flow.
 *
 * Uses testcontainers to spin up a real PostgreSQL instance so that
 * every query runs against an actual database rather than mocks.
 */

let container: StartedTestContainer;
let testPool: Pool;

// We need to override the pool used by the services at runtime.
// The simplest way is to replace the default export of the database module.
jest.mock('../../src/config/database', () => {
  // Return a placeholder — we swap the query fn in beforeAll once PG is up.
  const placeholder: Record<string, unknown> = {};
  return {
    __esModule: true,
    default: placeholder,
    initDatabase: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const databaseModule = require('../../src/config/database');

beforeAll(async () => {
  // Start PostgreSQL container
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'mortgage_test',
      POSTGRES_USER: 'mortgage',
      POSTGRES_PASSWORD: 'mortgage_dev',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);

  testPool = new Pool({
    host,
    port,
    database: 'mortgage_test',
    user: 'mortgage',
    password: 'mortgage_dev',
    max: 5,
  });

  // Wire up the module-level pool so all service imports use our test pool
  databaseModule.default.query = testPool.query.bind(testPool);
  databaseModule.default.connect = testPool.connect.bind(testPool);

  // Run schema creation
  const client = await testPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY,
        applicant_first_name VARCHAR(100) NOT NULL,
        applicant_last_name VARCHAR(100) NOT NULL,
        applicant_email VARCHAR(255) NOT NULL,
        applicant_phone VARCHAR(20),
        applicant_date_of_birth DATE,
        applicant_annual_income DECIMAL(15,2),
        applicant_employment_status VARCHAR(50),
        applicant_employer_name VARCHAR(200),
        property_address_line1 VARCHAR(255),
        property_address_line2 VARCHAR(255),
        property_city VARCHAR(100),
        property_postcode VARCHAR(20),
        property_country VARCHAR(100) DEFAULT 'United Kingdom',
        property_type VARCHAR(50),
        property_value DECIMAL(15,2),
        loan_amount DECIMAL(15,2) NOT NULL,
        loan_term_months INTEGER NOT NULL,
        loan_type VARCHAR(50) NOT NULL DEFAULT 'fixed',
        interest_rate DECIMAL(5,4),
        ltv_ratio DECIMAL(5,4),
        monthly_payment DECIMAL(15,2),
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        decision VARCHAR(50),
        decision_reason TEXT,
        assigned_underwriter VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY,
        application_id UUID REFERENCES applications(id),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor VARCHAR(100),
        changes JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_checks (
        id UUID PRIMARY KEY,
        application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
        credit_score INTEGER NOT NULL,
        risk_band VARCHAR(20) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        request_payload JSONB,
        response_payload JSONB,
        checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_application_id ON audit_events(application_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_checks_application_id ON credit_checks(application_id);
    `);
  } finally {
    client.release();
  }
}, 120_000);

afterAll(async () => {
  if (testPool) await testPool.end();
  if (container) await container.stop();
}, 30_000);

// Clean tables between tests so each test is isolated
afterEach(async () => {
  await testPool.query('DELETE FROM credit_checks');
  await testPool.query('DELETE FROM audit_events');
  await testPool.query('DELETE FROM applications');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const applicationService = new ApplicationService();
const creditCheckService = new CreditCheckService();

async function createSubmittedApplication(overrides: Record<string, unknown> = {}) {
  const app = await applicationService.create({
    applicant_first_name: 'John',
    applicant_last_name: 'Doe',
    applicant_email: 'john.doe@example.com',
    applicant_annual_income: 85000,
    applicant_employment_status: 'employed',
    property_value: 450000,
    property_address_line1: '10 Downing Street',
    property_city: 'London',
    property_postcode: 'SW1A 2AA',
    loan_amount: 350000,
    loan_term_months: 300,
    loan_type: 'fixed',
    ...overrides,
  });

  // Submit the application so it's eligible for credit check
  const submitted = await applicationService.submit(app.id);
  return submitted!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Credit Check E2E — full flow', () => {
  // -----------------------------------------------------------------------
  // 1. Happy path
  // -----------------------------------------------------------------------
  describe('Happy path', () => {
    it('should create application → run credit check → persist score & risk band → emit audit event', async () => {
      const app = await createSubmittedApplication();

      // Run credit check
      const check = await creditCheckService.runCheck({
        application_id: app.id,
        applicant_annual_income: 85000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      });

      // Verify the returned credit check
      expect(check).toBeDefined();
      expect(check.id).toBeDefined();
      expect(check.application_id).toBe(app.id);
      expect(check.credit_score).toBeGreaterThanOrEqual(300);
      expect(check.credit_score).toBeLessThanOrEqual(850);
      expect(['low', 'medium', 'high', 'very_high']).toContain(check.risk_band);
      expect(check.provider).toBe('mock-experian');

      // Verify score calculation: income 85k → base 780 (≥75k), employed +10, LTV 350/450=0.778 → no adj → 790
      // Wait: 85000 >= 75000 so base = 740. employed +10. LTV = 350000/450000 ≈ 0.778 (between 0.6 and 0.8, no adj).
      // Total = 740 + 10 = 750
      expect(check.credit_score).toBe(750);
      expect(check.risk_band).toBe('low'); // 750 >= 720

      // Verify persisted in credit_checks table
      const dbRow = await testPool.query('SELECT * FROM credit_checks WHERE id = $1', [check.id]);
      expect(dbRow.rows).toHaveLength(1);
      expect(dbRow.rows[0].credit_score).toBe(750);
      expect(dbRow.rows[0].risk_band).toBe('low');
      expect(dbRow.rows[0].application_id).toBe(app.id);

      // Verify audit event was recorded
      const auditRows = await testPool.query(
        "SELECT * FROM audit_events WHERE application_id = $1 AND action = 'credit_check.completed'",
        [app.id]
      );
      expect(auditRows.rows).toHaveLength(1);

      const auditEvent = auditRows.rows[0];
      expect(auditEvent.entity_type).toBe('credit_check');
      expect(auditEvent.entity_id).toBe(check.id);
      expect(auditEvent.actor).toBe('system');

      const changes = auditEvent.changes;
      expect(changes.risk_band).toBe('low');
      expect(changes.credit_score).toBe(750);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Scoring scenarios
  // -----------------------------------------------------------------------
  describe('Scoring scenarios', () => {
    interface ScenarioInput {
      income: number;
      employment: string;
      loanAmount: number;
      propertyValue: number;
    }

    const scenarios: Array<{
      name: string;
      input: ScenarioInput;
      expectedScore: number;
      expectedRiskBand: string;
    }> = [
      {
        name: 'High income, employed, low LTV → LOW risk',
        input: { income: 100000, employment: 'employed', loanAmount: 250000, propertyValue: 500000 },
        // base 780 + 10(employed) + 20(LTV 0.5 ≤ 0.6) = 810
        expectedScore: 810,
        expectedRiskBand: 'low',
      },
      {
        name: 'Mid income, employed, mid LTV → LOW risk',
        input: { income: 75000, employment: 'employed', loanAmount: 350000, propertyValue: 500000 },
        // base 740 + 10(employed) + 0(LTV 0.7) = 750
        expectedScore: 750,
        expectedRiskBand: 'low',
      },
      {
        name: 'Mid income, self-employed, mid LTV → LOW risk',
        input: { income: 75000, employment: 'self-employed', loanAmount: 350000, propertyValue: 500000 },
        // base 740 - 10(self-employed) + 0(LTV 0.7) = 730
        expectedScore: 730,
        expectedRiskBand: 'low',
      },
      {
        name: 'Moderate income, employed, high LTV → MEDIUM risk',
        input: { income: 50000, employment: 'employed', loanAmount: 420000, propertyValue: 500000 },
        // base 700 + 10(employed) - 30(LTV 0.84 > 0.8) = 680
        expectedScore: 680,
        expectedRiskBand: 'medium',
      },
      {
        name: 'Lower income, self-employed, high LTV → HIGH risk',
        input: { income: 30000, employment: 'self-employed', loanAmount: 350000, propertyValue: 400000 },
        // base 660 - 10(self-employed) - 30(LTV 0.875 > 0.8) = 620
        expectedScore: 620,
        expectedRiskBand: 'high',
      },
      {
        name: 'Low income, unemployed, mid LTV → VERY_HIGH risk',
        input: { income: 25000, employment: 'unemployed', loanAmount: 180000, propertyValue: 250000 },
        // base 620(<30k) - 80(unemployed) + 0(LTV 0.72) = 540
        expectedScore: 540,
        expectedRiskBand: 'very_high',
      },
      {
        name: 'Low income, unemployed, very high LTV → VERY_HIGH risk (clamped)',
        input: { income: 20000, employment: 'unemployed', loanAmount: 470000, propertyValue: 500000 },
        // base 620(<30k) - 80(unemployed) - 60(LTV 0.94 > 0.9) = 480
        expectedScore: 480,
        expectedRiskBand: 'very_high',
      },
    ];

    it.each(scenarios)('$name', async ({ input, expectedScore, expectedRiskBand }) => {
      const app = await createSubmittedApplication({
        applicant_annual_income: input.income,
        applicant_employment_status: input.employment,
        loan_amount: input.loanAmount,
        property_value: input.propertyValue,
      });

      const check = await creditCheckService.runCheck({
        application_id: app.id,
        applicant_annual_income: input.income,
        applicant_employment_status: input.employment,
        loan_amount: input.loanAmount,
        property_value: input.propertyValue,
      });

      expect(check.credit_score).toBe(expectedScore);
      expect(check.risk_band).toBe(expectedRiskBand);

      // Cross-verify with getRiskBand function
      expect(getRiskBand(check.credit_score)).toBe(expectedRiskBand);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Idempotency
  // -----------------------------------------------------------------------
  describe('Idempotency', () => {
    it('should reject a second credit check on the same application with ConflictError', async () => {
      const app = await createSubmittedApplication();

      const request = {
        application_id: app.id,
        applicant_annual_income: 85000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      };

      // First check succeeds
      const firstCheck = await creditCheckService.runCheck(request);
      expect(firstCheck).toBeDefined();
      expect(firstCheck.credit_score).toBe(750);

      // Second check on the same application must fail
      await expect(creditCheckService.runCheck(request)).rejects.toThrow(ConflictError);
      await expect(creditCheckService.runCheck(request)).rejects.toThrow(
        /Credit check already exists/
      );

      // Verify only one row exists in the database
      const rows = await testPool.query(
        'SELECT COUNT(*)::int as cnt FROM credit_checks WHERE application_id = $1',
        [app.id]
      );
      expect(rows.rows[0].cnt).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Edge cases — risk band boundaries
  // -----------------------------------------------------------------------
  describe('Edge cases — risk band boundary values', () => {
    it('getRiskBand returns "low" at exact boundary 720', () => {
      expect(getRiskBand(720)).toBe('low');
    });

    it('getRiskBand returns "medium" at 719 (just below low)', () => {
      expect(getRiskBand(719)).toBe('medium');
    });

    it('getRiskBand returns "medium" at exact boundary 660', () => {
      expect(getRiskBand(660)).toBe('medium');
    });

    it('getRiskBand returns "high" at 659 (just below medium)', () => {
      expect(getRiskBand(659)).toBe('high');
    });

    it('getRiskBand returns "high" at exact boundary 600', () => {
      expect(getRiskBand(600)).toBe('high');
    });

    it('getRiskBand returns "very_high" at 599 (just below high)', () => {
      expect(getRiskBand(599)).toBe('very_high');
    });

    it('getRiskBand returns "low" at maximum score 850', () => {
      expect(getRiskBand(850)).toBe('low');
    });

    it('getRiskBand returns "very_high" at minimum score 300', () => {
      expect(getRiskBand(300)).toBe('very_high');
    });
  });

  // -----------------------------------------------------------------------
  // 5. Audit trail completeness
  // -----------------------------------------------------------------------
  describe('Audit trail completeness', () => {
    it('should record both application.created, application.submitted, and credit_check.completed events', async () => {
      const app = await createSubmittedApplication();

      await creditCheckService.runCheck({
        application_id: app.id,
        applicant_annual_income: 85000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      });

      const auditRows = await testPool.query(
        'SELECT action FROM audit_events WHERE application_id = $1 ORDER BY created_at ASC',
        [app.id]
      );

      const actions = auditRows.rows.map((r: { action: string }) => r.action);
      expect(actions).toContain('application.created');
      expect(actions).toContain('application.submitted');
      expect(actions).toContain('credit_check.completed');
    });
  });

  // -----------------------------------------------------------------------
  // 6. Persistence verification
  // -----------------------------------------------------------------------
  describe('Persistence', () => {
    it('should persist request_payload and response_payload as JSONB', async () => {
      const app = await createSubmittedApplication();

      const check = await creditCheckService.runCheck({
        application_id: app.id,
        applicant_annual_income: 85000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      });

      const row = await testPool.query('SELECT * FROM credit_checks WHERE id = $1', [check.id]);
      const record = row.rows[0];

      // request_payload should contain the input data
      expect(record.request_payload).toBeDefined();
      expect(record.request_payload.application_id).toBe(app.id);
      expect(record.request_payload.applicant_annual_income).toBe(85000);

      // response_payload should contain mock provider output
      expect(record.response_payload).toBeDefined();
      expect(record.response_payload.provider).toBe('mock-experian');
      expect(record.response_payload.score).toBe(750);
    });

    it('should retrieve persisted credit check via getByApplicationId', async () => {
      const app = await createSubmittedApplication();

      const created = await creditCheckService.runCheck({
        application_id: app.id,
        applicant_annual_income: 85000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      });

      const retrieved = await creditCheckService.getByApplicationId(app.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.credit_score).toBe(created.credit_score);
      expect(retrieved!.risk_band).toBe(created.risk_band);
    });
  });
});
