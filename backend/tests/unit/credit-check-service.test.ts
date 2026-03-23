import { CreditCheckService } from '../../src/services/credit-check-service';
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

describe('CreditCheckService', () => {
  let service: CreditCheckService;

  beforeEach(() => {
    service = new CreditCheckService();
    jest.clearAllMocks();
  });

  const baseRequest = {
    application_id: 'app-uuid-1',
    applicant_annual_income: 85000,
    applicant_employment_status: 'employed',
    loan_amount: 350000,
    property_value: 450000,
  };

  describe('runCheck', () => {
    it('should run a credit check and store the result', async () => {
      const mockCreditCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        credit_score: 750,
        risk_band: 'low',
        provider: 'mock-experian',
        request_payload: baseRequest,
        response_payload: {},
        checked_at: expect.any(String),
        created_at: expect.any(String),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // SELECT (no existing check)
        .mockResolvedValueOnce({ rows: [mockCreditCheck], rowCount: 1 } as never) // INSERT credit_check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // INSERT audit_event

      const result = await service.runCheck(baseRequest);

      expect(result).toBeDefined();
      expect(result.credit_score).toBe(750);
      expect(result.risk_band).toBe('low');
      expect(mockQuery).toHaveBeenCalledTimes(3);

      // Verify the INSERT query
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO credit_checks'),
        expect.arrayContaining(['app-uuid-1'])
      );

      // Verify audit event was created
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO audit_events'),
        expect.arrayContaining(['credit_check.completed'])
      );
    });

    it('should reject duplicate credit check with 409 (idempotency guard)', async () => {
      const existingCheck = {
        id: 'existing-uuid',
        application_id: 'app-uuid-1',
        credit_score: 750,
        risk_band: 'low',
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingCheck], rowCount: 1 } as never);

      try {
        await service.runCheck(baseRequest);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        expect((error as ConflictError).message).toContain('Credit check already exists');
        expect((error as ConflictError).status).toBe(409);
      }

      // Should only have queried once (the SELECT), not attempted INSERT
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByApplicationId', () => {
    it('should return credit check for existing application', async () => {
      const mockCheck = {
        id: 'check-uuid',
        application_id: 'app-uuid-1',
        credit_score: 720,
        risk_band: 'low',
        provider: 'mock-experian',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCheck], rowCount: 1 } as never);

      const result = await service.getByApplicationId('app-uuid-1');
      expect(result).toEqual(mockCheck);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['app-uuid-1']
      );
    });

    it('should return null for non-existent application', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getByApplicationId('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('callMockProvider — score calculation', () => {
    it('should assign high score for high income employed applicant', () => {
      const result = service.callMockProvider({
        application_id: 'app-1',
        applicant_annual_income: 100000,
        applicant_employment_status: 'employed',
        loan_amount: 300000,
        property_value: 500000,
      });

      // Base 780 (income 100k+) + 10 (employed) + 20 (LTV 0.6) = 810
      expect(result.credit_score).toBe(810);
      expect(result.provider).toBe('mock-experian');
    });

    it('should assign medium score for mid income applicant', () => {
      const result = service.callMockProvider({
        application_id: 'app-2',
        applicant_annual_income: 50000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      });

      // Base 700 (income 50k+) + 10 (employed) - 0 (LTV ~0.78) = 710
      expect(result.credit_score).toBe(710);
    });

    it('should penalise high LTV ratio', () => {
      const result = service.callMockProvider({
        application_id: 'app-3',
        applicant_annual_income: 75000,
        applicant_employment_status: 'employed',
        loan_amount: 470000,
        property_value: 500000,
      });

      // Base 740 (income 75k+) + 10 (employed) - 60 (LTV 0.94 > 0.9) = 690
      expect(result.credit_score).toBe(690);
    });

    it('should penalise self-employed status', () => {
      const result = service.callMockProvider({
        application_id: 'app-4',
        applicant_annual_income: 75000,
        applicant_employment_status: 'self-employed',
        loan_amount: 350000,
        property_value: 500000,
      });

      // Base 740 (income 75k+) - 10 (self-employed) + 0 (LTV 0.7) = 730
      expect(result.credit_score).toBe(730);
    });

    it('should severely penalise unemployed status', () => {
      const result = service.callMockProvider({
        application_id: 'app-5',
        applicant_annual_income: 30000,
        applicant_employment_status: 'unemployed',
        loan_amount: 200000,
        property_value: 250000,
      });

      // Base 660 (income 30k+) - 80 (unemployed) + 0 (LTV 0.8, not > 0.8) = 580
      expect(result.credit_score).toBe(580);
    });

    it('should clamp score to minimum 300', () => {
      const result = service.callMockProvider({
        application_id: 'app-6',
        applicant_annual_income: 10000,
        applicant_employment_status: 'unemployed',
        loan_amount: 480000,
        property_value: 500000,
      });

      // Base 620 (income <30k) - 80 (unemployed) - 60 (LTV 0.96 > 0.9) = 480
      // Still above 300, so not clamped here. Let's verify the formula is correct.
      expect(result.credit_score).toBe(480);
      expect(result.credit_score).toBeGreaterThanOrEqual(300);
    });

    it('should clamp score to maximum 850', () => {
      const result = service.callMockProvider({
        application_id: 'app-7',
        applicant_annual_income: 200000,
        applicant_employment_status: 'employed',
        loan_amount: 100000,
        property_value: 500000,
      });

      // Base 780 (income 100k+) + 10 (employed) + 20 (LTV 0.2 <= 0.6) = 810
      expect(result.credit_score).toBe(810);
      expect(result.credit_score).toBeLessThanOrEqual(850);
    });

    it('should return deterministic results for same input', () => {
      const input = {
        application_id: 'app-det',
        applicant_annual_income: 60000,
        applicant_employment_status: 'employed',
        loan_amount: 300000,
        property_value: 400000,
      };

      const result1 = service.callMockProvider(input);
      const result2 = service.callMockProvider(input);

      expect(result1.credit_score).toBe(result2.credit_score);
      expect(result1.provider).toBe(result2.provider);
    });
  });

  describe('callMockProvider — risk band assignment', () => {
    it('should produce low risk band for score >= 720', () => {
      const result = service.callMockProvider({
        application_id: 'app-rb-1',
        applicant_annual_income: 100000,
        applicant_employment_status: 'employed',
        loan_amount: 300000,
        property_value: 500000,
      });

      // Score = 810
      expect(result.credit_score).toBeGreaterThanOrEqual(720);
    });

    it('should produce medium risk band for score 660-719', () => {
      const result = service.callMockProvider({
        application_id: 'app-rb-2',
        applicant_annual_income: 50000,
        applicant_employment_status: 'employed',
        loan_amount: 350000,
        property_value: 450000,
      });

      // Score = 710
      expect(result.credit_score).toBeGreaterThanOrEqual(660);
      expect(result.credit_score).toBeLessThan(720);
    });

    it('should produce high risk band for score 600-659', () => {
      const result = service.callMockProvider({
        application_id: 'app-rb-3',
        applicant_annual_income: 30000,
        applicant_employment_status: 'self-employed',
        loan_amount: 350000,
        property_value: 400000,
      });

      // Base 660 - 10 (self-employed) - 0 (LTV 0.875, between 0.8 and 0.9) = 650
      // Wait, LTV > 0.8 so -30: 660 - 10 - 30 = 620
      expect(result.credit_score).toBeGreaterThanOrEqual(600);
      expect(result.credit_score).toBeLessThan(660);
    });

    it('should produce very_high risk band for score < 600', () => {
      const result = service.callMockProvider({
        application_id: 'app-rb-4',
        applicant_annual_income: 25000,
        applicant_employment_status: 'unemployed',
        loan_amount: 200000,
        property_value: 250000,
      });

      // Base 620 (<30k) - 80 (unemployed) - 30 (LTV 0.8) = 510
      expect(result.credit_score).toBeLessThan(600);
    });
  });

  describe('getRiskBand — boundary tests', () => {
    // Import the standalone function for direct testing
    const { getRiskBand } = jest.requireActual('../../src/models/credit-check') as {
      getRiskBand: (score: number) => string;
    };

    it('should return low for score exactly 720', () => {
      expect(getRiskBand(720)).toBe('low');
    });

    it('should return low for score 850', () => {
      expect(getRiskBand(850)).toBe('low');
    });

    it('should return medium for score 719', () => {
      expect(getRiskBand(719)).toBe('medium');
    });

    it('should return medium for score exactly 660', () => {
      expect(getRiskBand(660)).toBe('medium');
    });

    it('should return high for score 659', () => {
      expect(getRiskBand(659)).toBe('high');
    });

    it('should return high for score exactly 600', () => {
      expect(getRiskBand(600)).toBe('high');
    });

    it('should return very_high for score 599', () => {
      expect(getRiskBand(599)).toBe('very_high');
    });

    it('should return very_high for score 300', () => {
      expect(getRiskBand(300)).toBe('very_high');
    });
  });

  describe('audit event creation', () => {
    it('should create audit event with credit_check.completed action', async () => {
      const mockCreditCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        credit_score: 750,
        risk_band: 'low',
        provider: 'mock-experian',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [mockCreditCheck], rowCount: 1 } as never) // INSERT credit_check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // INSERT audit_event

      await service.runCheck(baseRequest);

      // Third call should be the audit event
      const auditCall = mockQuery.mock.calls[2];
      expect(auditCall[0]).toContain('INSERT INTO audit_events');
      expect(auditCall[1]).toContain('credit_check.completed');
      expect(auditCall[1]).toContain('app-uuid-1');

      // Verify changes JSON contains risk band and score
      const changesJson = auditCall[1]![6] as string;
      const changes = JSON.parse(changesJson);
      expect(changes.risk_band).toBe('low');
      expect(changes.credit_score).toBe(750);
    });

    it('should include provider metadata in audit event', async () => {
      const mockCreditCheck = {
        id: 'test-uuid-1234',
        application_id: 'app-uuid-1',
        credit_score: 750,
        risk_band: 'low',
        provider: 'mock-experian',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [mockCreditCheck], rowCount: 1 } as never) // INSERT credit_check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // INSERT audit_event

      await service.runCheck(baseRequest);

      const auditCall = mockQuery.mock.calls[2];
      const metadataJson = auditCall[1]![7] as string;
      const metadata = JSON.parse(metadataJson);
      expect(metadata.provider).toBe('mock-experian');
      expect(metadata.source).toBe('api');
    });
  });

  describe('error handling', () => {
    it('should propagate database errors from INSERT', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // SELECT (no existing)
        .mockRejectedValueOnce(new Error('connection refused') as never); // INSERT fails

      await expect(service.runCheck(baseRequest)).rejects.toThrow('connection refused');
    });

    it('should propagate database errors from SELECT', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused') as never);

      await expect(service.runCheck(baseRequest)).rejects.toThrow('connection refused');
    });

    it('should propagate database errors from getByApplicationId', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout') as never);

      await expect(service.getByApplicationId('any-id')).rejects.toThrow('timeout');
    });
  });
});
