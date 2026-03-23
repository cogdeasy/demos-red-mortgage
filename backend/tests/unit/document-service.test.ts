import { DocumentService } from '../../src/services/document-service';
import pool from '../../src/config/database';

jest.mock('../../src/config/database', () => {
  const mockPool = { query: jest.fn() };
  return {
    __esModule: true,
    default: mockPool,
  };
});

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

describe('DocumentService', () => {
  let service: DocumentService;

  beforeEach(() => {
    service = new DocumentService();
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload a document and emit audit event', async () => {
      const mockDoc = {
        id: 'doc-uuid',
        application_id: 'app-uuid',
        document_type: 'payslip',
        file_name: 'payslip-2024.pdf',
        file_size: 102400,
        mime_type: 'application/pdf',
        verified: false,
        created_at: new Date().toISOString(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockDoc], rowCount: 1 } as never) // INSERT document
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // INSERT audit_event

      const result = await service.upload('app-uuid', {
        document_type: 'payslip',
        file_name: 'payslip-2024.pdf',
        file_size: 102400,
        mime_type: 'application/pdf',
      });

      expect(result).toEqual(mockDoc);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('listByApplication', () => {
    it('should list documents for an application', async () => {
      const mockDocs = [
        { id: 'doc-1', document_type: 'payslip', verified: false },
        { id: 'doc-2', document_type: 'id_proof', verified: true },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDocs, rowCount: 2 } as never);

      const result = await service.listByApplication('app-uuid');
      expect(result).toHaveLength(2);
    });
  });

  describe('verify', () => {
    it('should verify a document', async () => {
      const verifiedDoc = { id: 'doc-uuid', verified: true, verified_by: 'reviewer@test.com' };

      mockQuery
        .mockResolvedValueOnce({ rows: [verifiedDoc], rowCount: 1 } as never) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // audit event

      const result = await service.verify('doc-uuid', 'reviewer@test.com');
      expect(result!.verified).toBe(true);
    });

    it('should return null for non-existent document', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.verify('non-existent', 'reviewer@test.com');
      expect(result).toBeNull();
    });
  });
});
