import { AffordabilityService } from '../../src/services/affordability-service';
import { ConflictError } from '../../src/errors';
import pool from '../../src/config/database';

// Mock the database pool
jest.mock('../../src/config/database', () => {
  const mockPool = { query: jest.fn() };
  return {
    __esModule: true,
    default: mockPool,
    initializeDatabase: jest.fn(),
  };
});

// Mock uuid to return deterministic values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

describe('AffordabilityService', () => {
  let service: AffordabilityService;

  beforeEach(() => {
    service = new AffordabilityService();
    jest.clearAllMocks();
  });

  // Helper to build a mock application row
  function mockApplication(overrides: Record<string, unknown> = {}) {
    return {
      id: 'app-uuid-1',
      applicant_annual_income: 60000,
      loan_amount: 200000,
      loan_term_months: 300, // 25 years
      interest_rate: 0.045,
      monthly_rent_or_mortgage: 500,
      monthly_credit_commitments: 200,
      monthly_living_costs: 800,
      number_of_dependants: 0,
      ...overrides,
    };
  }

  describe('runAssessment — pass verdict', () => {
    it('should return pass when stressed DTI <= 0.45', async () => {
      // High income, low outgoings, small loan => low DTI
      const app = mockApplication({
        applicant_annual_income: 120000, // 10000/month
        loan_amount: 150000,
        loan_term_months: 300,
        interest_rate: 0.04,
        monthly_rent_or_mortgage: 0,
        monthly_credit_commitments: 0,
        monthly_living_costs: 500,
      });

      const mockAffordabilityCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        gross_monthly_income: 10000,
        declared_monthly_outgoings: 500,
        mortgage_payment_current: expect.any(Number),
        mortgage_payment_stressed: expect.any(Number),
        dti_ratio_current: expect.any(Number),
        dti_ratio_stressed: expect.any(Number),
        verdict: 'pass',
        verdict_reason: expect.stringContaining('within the 45% threshold'),
        checked_at: expect.any(String),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment SELECT
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockResolvedValueOnce({ rows: [mockAffordabilityCheck], rowCount: 1 } as never) // INSERT affordability_check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // INSERT audit_event

      const result = await service.runAssessment('app-uuid-1');

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      expect(mockQuery).toHaveBeenCalledTimes(4);

      // Verify INSERT query
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO affordability_checks'),
        expect.arrayContaining(['app-uuid-1'])
      );

      // Verify audit event
      expect(mockQuery).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO audit_events'),
        expect.arrayContaining(['affordability_check.completed'])
      );
    });
  });

  describe('runAssessment — marginal verdict', () => {
    it('should return marginal when stressed DTI > 0.45 and <= 0.55', async () => {
      // Choose income and outgoings so stressed DTI falls between 0.45 and 0.55
      const app = mockApplication({
        applicant_annual_income: 48000, // 4000/month
        loan_amount: 120000,
        loan_term_months: 300,
        interest_rate: 0.04,
        monthly_rent_or_mortgage: 200,
        monthly_credit_commitments: 100,
        monthly_living_costs: 800,
      });

      const mockAffordabilityCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        verdict: 'marginal',
        verdict_reason: expect.stringContaining('exceeds the 45% comfort threshold'),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockResolvedValueOnce({ rows: [mockAffordabilityCheck], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit

      const result = await service.runAssessment('app-uuid-1');

      expect(result).toBeDefined();
      expect(result.verdict).toBe('marginal');
    });
  });

  describe('runAssessment — fail verdict', () => {
    it('should return fail when stressed DTI > 0.55', async () => {
      // Low income, high outgoings => high DTI
      const app = mockApplication({
        applicant_annual_income: 30000, // 2500/month
        loan_amount: 200000,
        loan_term_months: 300,
        interest_rate: 0.05,
        monthly_rent_or_mortgage: 400,
        monthly_credit_commitments: 300,
        monthly_living_costs: 600,
      });

      const mockAffordabilityCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        verdict: 'fail',
        verdict_reason: expect.stringContaining('exceeds the 55% maximum threshold'),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockResolvedValueOnce({ rows: [mockAffordabilityCheck], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit

      const result = await service.runAssessment('app-uuid-1');

      expect(result).toBeDefined();
      expect(result.verdict).toBe('fail');
    });
  });

  describe('stress test calculation', () => {
    it('should use interest_rate + 0.03 for stressed payment', async () => {
      const app = mockApplication({
        applicant_annual_income: 100000,
        loan_amount: 200000,
        loan_term_months: 300,
        interest_rate: 0.04, // stressed = 0.07
        monthly_rent_or_mortgage: 0,
        monthly_credit_commitments: 0,
        monthly_living_costs: 0,
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1234', verdict: 'pass' }], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit

      await service.runAssessment('app-uuid-1');

      // Verify INSERT was called with correct values
      const insertCall = mockQuery.mock.calls[2];
      const params = insertCall[1] as unknown[];
      // params[4] is mortgage_payment_current, params[5] is mortgage_payment_stressed
      const currentPayment = params[4] as number;
      const stressedPayment = params[5] as number;

      // Stressed payment should be higher than current
      expect(stressedPayment).toBeGreaterThan(currentPayment);

      // Verify the actual stressed payment matches rate + 3%
      // Current rate: 0.04 => monthly rate 0.04/12
      // Stressed rate: 0.07 => monthly rate 0.07/12
      const monthlyRateCurrent = 0.04 / 12;
      const expectedCurrent = 200000 * (monthlyRateCurrent * Math.pow(1 + monthlyRateCurrent, 300))
        / (Math.pow(1 + monthlyRateCurrent, 300) - 1);

      const monthlyRateStressed = 0.07 / 12;
      const expectedStressed = 200000 * (monthlyRateStressed * Math.pow(1 + monthlyRateStressed, 300))
        / (Math.pow(1 + monthlyRateStressed, 300) - 1);

      expect(currentPayment).toBeCloseTo(Math.round(expectedCurrent * 100) / 100, 2);
      expect(stressedPayment).toBeCloseTo(Math.round(expectedStressed * 100) / 100, 2);
    });
  });

  describe('idempotency guard', () => {
    it('should throw ConflictError when assessment already exists', async () => {
      const existingCheck = {
        id: 'existing-uuid',
        application_id: 'app-uuid-1',
        verdict: 'pass',
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingCheck], rowCount: 1 } as never);

      try {
        await service.runAssessment('app-uuid-1');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        expect((error as ConflictError).message).toContain('Affordability check already exists');
        expect((error as ConflictError).status).toBe(409);
      }

      // Should only have queried once (the SELECT for existing check)
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('application not found', () => {
    it('should throw error when application does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment (no existing check)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never); // SELECT application (not found)

      await expect(service.runAssessment('non-existent-id')).rejects.toThrow(
        'Application not found: non-existent-id'
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero income with automatic fail', async () => {
      const app = mockApplication({
        applicant_annual_income: 0,
        loan_amount: 200000,
        loan_term_months: 300,
        interest_rate: 0.04,
        monthly_rent_or_mortgage: 0,
        monthly_credit_commitments: 0,
        monthly_living_costs: 0,
      });

      const mockAffordabilityCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        verdict: 'fail',
        dti_ratio_current: 9.9999,
        dti_ratio_stressed: 9.9999,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockResolvedValueOnce({ rows: [mockAffordabilityCheck], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit

      const result = await service.runAssessment('app-uuid-1');
      expect(result.verdict).toBe('fail');

      // Verify DTI was set to 9.9999 for zero income
      const insertCall = mockQuery.mock.calls[2];
      const params = insertCall[1] as unknown[];
      expect(params[6]).toBe(9.9999); // dti_ratio_current
      expect(params[7]).toBe(9.9999); // dti_ratio_stressed
    });

    it('should default missing outgoings fields to 0', async () => {
      const app = mockApplication({
        applicant_annual_income: 60000,
        loan_amount: 200000,
        loan_term_months: 300,
        interest_rate: 0.04,
        monthly_rent_or_mortgage: null,
        monthly_credit_commitments: null,
        monthly_living_costs: null,
      });

      const mockAffordabilityCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        verdict: 'pass',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockResolvedValueOnce({ rows: [mockAffordabilityCheck], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit

      await service.runAssessment('app-uuid-1');

      // With null outgoings defaulting to 0, declared_monthly_outgoings should be 0
      const insertCall = mockQuery.mock.calls[2];
      const params = insertCall[1] as unknown[];
      expect(params[3]).toBe(0); // declared_monthly_outgoings = 0
    });

    it('should use default interest rate (0.0425) when not specified', async () => {
      const app = mockApplication({
        applicant_annual_income: 60000,
        loan_amount: 200000,
        loan_term_months: 300,
        interest_rate: null,
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1234', verdict: 'pass' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.runAssessment('app-uuid-1');

      // Verify the default rate was used: current payment should use 0.0425
      const insertCall = mockQuery.mock.calls[2];
      const params = insertCall[1] as unknown[];
      const currentPayment = params[4] as number;

      const monthlyRate = 0.0425 / 12;
      const expected = 200000 * (monthlyRate * Math.pow(1 + monthlyRate, 300))
        / (Math.pow(1 + monthlyRate, 300) - 1);

      expect(currentPayment).toBeCloseTo(Math.round(expected * 100) / 100, 2);
    });
  });

  describe('getAssessment', () => {
    it('should return affordability check for existing application', async () => {
      const mockCheck = {
        id: 'check-uuid',
        application_id: 'app-uuid-1',
        verdict: 'pass',
        dti_ratio_stressed: 0.35,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCheck], rowCount: 1 } as never);

      const result = await service.getAssessment('app-uuid-1');
      expect(result).toEqual(mockCheck);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['app-uuid-1']
      );
    });

    it('should return null for non-existent application', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getAssessment('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('audit event creation', () => {
    it('should create audit event with affordability_check.completed action', async () => {
      const app = mockApplication({
        applicant_annual_income: 120000,
        loan_amount: 150000,
        monthly_rent_or_mortgage: 0,
        monthly_credit_commitments: 0,
        monthly_living_costs: 500,
      });

      const mockAffordabilityCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        verdict: 'pass',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [mockAffordabilityCheck], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.runAssessment('app-uuid-1');

      // Fourth call should be the audit event
      const auditCall = mockQuery.mock.calls[3];
      expect(auditCall[0]).toContain('INSERT INTO audit_events');
      expect(auditCall[1]).toContain('affordability_check.completed');
      expect(auditCall[1]).toContain('app-uuid-1');

      // Verify changes JSON contains verdict and DTI
      const changesJson = auditCall[1]![6] as string;
      const changes = JSON.parse(changesJson);
      expect(changes.verdict).toBeDefined();
      expect(changes.dti_ratio_stressed).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should propagate database errors from INSERT', async () => {
      const app = mockApplication();

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getAssessment
        .mockResolvedValueOnce({ rows: [app], rowCount: 1 } as never) // SELECT application
        .mockRejectedValueOnce(new Error('connection refused') as never); // INSERT fails

      await expect(service.runAssessment('app-uuid-1')).rejects.toThrow('connection refused');
    });

    it('should propagate database errors from SELECT', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused') as never);

      await expect(service.runAssessment('app-uuid-1')).rejects.toThrow('connection refused');
    });

    it('should propagate database errors from getAssessment', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout') as never);

      await expect(service.getAssessment('any-id')).rejects.toThrow('timeout');
    });
  });
});
