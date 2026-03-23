import { ApplicationService } from '../../src/services/application-service';
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

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(() => {
    service = new ApplicationService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an application with calculated fields', async () => {
      const mockApp = {
        id: 'test-uuid',
        applicant_first_name: 'John',
        applicant_last_name: 'Smith',
        applicant_email: 'john@example.com',
        loan_amount: 200000,
        loan_term_months: 300,
        loan_type: 'fixed',
        property_value: 250000,
        status: 'draft',
        interest_rate: 0.0475,
        ltv_ratio: 0.8,
        monthly_payment: 1141.69,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockApp], rowCount: 1 } as never) // INSERT application
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // INSERT audit_event

      const result = await service.create({
        applicant_first_name: 'John',
        applicant_last_name: 'Smith',
        applicant_email: 'john@example.com',
        loan_amount: 200000,
        loan_term_months: 300,
        loan_type: 'fixed',
        property_value: 250000,
      });

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should reject invalid email', async () => {
      await expect(
        service.create({
          applicant_first_name: 'John',
          applicant_last_name: 'Smith',
          applicant_email: 'not-an-email',
          loan_amount: 200000,
          loan_term_months: 300,
          loan_type: 'fixed',
        })
      ).rejects.toThrow();
    });

    it('should reject negative loan amount', async () => {
      await expect(
        service.create({
          applicant_first_name: 'John',
          applicant_last_name: 'Smith',
          applicant_email: 'john@example.com',
          loan_amount: -5000,
          loan_term_months: 300,
          loan_type: 'fixed',
        })
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return application by id', async () => {
      const mockApp = {
        id: 'test-uuid',
        applicant_first_name: 'Jane',
        applicant_last_name: 'Doe',
        status: 'draft',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockApp], rowCount: 1 } as never);

      const result = await service.getById('test-uuid');
      expect(result).toEqual(mockApp);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test-uuid']
      );
    });

    it('should return null for non-existent id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list applications with default pagination', async () => {
      const mockApps = [{ id: '1', status: 'draft' }, { id: '2', status: 'submitted' }];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as never) // COUNT first
        .mockResolvedValueOnce({ rows: mockApps, rowCount: 2 } as never); // SELECT second

      const result = await service.list({});
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never) // COUNT first
        .mockResolvedValueOnce({ rows: [{ id: '1', status: 'submitted' }], rowCount: 1 } as never); // SELECT second

      const result = await service.list({ status: 'submitted' });
      expect(result.data).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.arrayContaining(['submitted'])
      );
    });
  });

  describe('submit', () => {
    it('should submit a draft application', async () => {
      const draftApp = { id: 'test-uuid', status: 'draft' };
      const submittedApp = { ...draftApp, status: 'submitted' };

      mockQuery
        .mockResolvedValueOnce({ rows: [draftApp], rowCount: 1 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [submittedApp], rowCount: 1 } as never) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit event

      const result = await service.submit('test-uuid');
      expect(result!.status).toBe('submitted');
    });

    it('should reject submitting non-draft application', async () => {
      const submittedApp = { id: 'test-uuid', status: 'submitted' };
      mockQuery.mockResolvedValueOnce({ rows: [submittedApp], rowCount: 1 } as never);

      await expect(service.submit('test-uuid')).rejects.toThrow();
    });
  });

  describe('decide', () => {
    it('should approve a submitted application', async () => {
      const submittedApp = { id: 'test-uuid', status: 'submitted' };
      const approvedApp = { ...submittedApp, status: 'approved', decision: 'approved' };

      mockQuery
        .mockResolvedValueOnce({ rows: [submittedApp], rowCount: 1 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [approvedApp], rowCount: 1 } as never) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit event

      const result = await service.decide('test-uuid', 'approved', 'Meets criteria', 'underwriter@test.com');
      expect(result!.status).toBe('approved');
    });

    it('should decline a submitted application', async () => {
      const submittedApp = { id: 'test-uuid', status: 'submitted' };
      const declinedApp = { ...submittedApp, status: 'declined', decision: 'declined' };

      mockQuery
        .mockResolvedValueOnce({ rows: [submittedApp], rowCount: 1 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [declinedApp], rowCount: 1 } as never) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit event

      const result = await service.decide('test-uuid', 'declined', 'LTV too high', 'underwriter@test.com');
      expect(result!.status).toBe('declined');
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1 } as never) // total
        .mockResolvedValueOnce({
          rows: [
            { status: 'draft', count: '3' },
            { status: 'submitted', count: '4' },
            { status: 'approved', count: '3' },
          ],
          rowCount: 3,
        } as never) // by_status
        .mockResolvedValueOnce({
          rows: [{ avg_loan: '250000', avg_ltv: '0.75' }],
          rowCount: 1,
        } as never); // averages

      const result = await service.getDashboardStats();
      expect(result.total).toBe(10);
      expect(result.by_status.draft).toBe(3);
      expect(result.by_status.submitted).toBe(4);
      expect(result.avg_loan_amount).toBe(250000);
      expect(result.avg_ltv).toBe(0.75);
    });
  });
});
