import { NoteService } from '../../src/services/note-service';
import pool from '../../src/config/database';

jest.mock('../../src/config/database', () => {
  const mockPool = { query: jest.fn() };
  return {
    __esModule: true,
    default: mockPool,
  };
});

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

describe('NoteService', () => {
  let service: NoteService;

  beforeEach(() => {
    service = new NoteService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a note and emit an audit event', async () => {
      const mockNote = {
        id: 'note-uuid',
        application_id: 'app-uuid',
        author: 'j.williams@hsbc.co.uk',
        content: 'Income documentation verified.',
        note_type: 'general',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockNote], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const result = await service.create('app-uuid', {
        author: 'j.williams@hsbc.co.uk',
        content: 'Income documentation verified.',
        note_type: 'general',
      });

      expect(result).toEqual(mockNote);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify note insert
      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO notes');
      expect(mockQuery.mock.calls[0][1]?.[1]).toBe('app-uuid');
      expect(mockQuery.mock.calls[0][1]?.[2]).toBe('j.williams@hsbc.co.uk');
      expect(mockQuery.mock.calls[0][1]?.[3]).toBe('Income documentation verified.');

      // Verify audit event
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO audit_events');
      expect(mockQuery.mock.calls[1][1]?.[2]).toBe('note');
      expect(mockQuery.mock.calls[1][1]?.[4]).toBe('note.created');
    });

    it('should default note_type to general when not provided', async () => {
      const mockNote = {
        id: 'note-uuid',
        application_id: 'app-uuid',
        author: 'test@test.com',
        content: 'Test note',
        note_type: 'general',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockNote], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.create('app-uuid', {
        author: 'test@test.com',
        content: 'Test note',
        note_type: '',
      });

      expect(mockQuery.mock.calls[0][1]?.[4]).toBe('general');
    });
  });

  describe('listByApplication', () => {
    it('should return notes ordered by created_at DESC', async () => {
      const mockNotes = [
        { id: '1', application_id: 'app-uuid', author: 'a', content: 'First', note_type: 'general', created_at: '2024-01-02' },
        { id: '2', application_id: 'app-uuid', author: 'b', content: 'Second', note_type: 'internal', created_at: '2024-01-01' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNotes, rowCount: 2 } as never);

      const result = await service.listByApplication('app-uuid');

      expect(result).toEqual(mockNotes);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
      expect(mockQuery.mock.calls[0][1]).toEqual(['app-uuid']);
    });

    it('should filter by note_type when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.listByApplication('app-uuid', 'condition');

      expect(mockQuery.mock.calls[0][0]).toContain('note_type = $2');
      expect(mockQuery.mock.calls[0][1]).toEqual(['app-uuid', 'condition']);
    });

    it('should return empty array when no notes exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.listByApplication('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a note when found', async () => {
      const mockNote = { id: 'note-uuid', application_id: 'app-uuid', author: 'a', content: 'Test', note_type: 'general', created_at: '2024-01-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockNote], rowCount: 1 } as never);

      const result = await service.getById('note-uuid');

      expect(result).toEqual(mockNote);
      expect(mockQuery.mock.calls[0][1]).toEqual(['note-uuid']);
    });

    it('should return null when note not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a note and emit an audit event', async () => {
      const mockNote = { id: 'note-uuid', application_id: 'app-uuid', author: 'a', content: 'Test', note_type: 'general', created_at: '2024-01-01' };

      // getById call
      mockQuery.mockResolvedValueOnce({ rows: [mockNote], rowCount: 1 } as never);
      // DELETE call
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
      // audit event call
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const result = await service.delete('note-uuid');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(3);

      // Verify DELETE
      expect(mockQuery.mock.calls[1][0]).toContain('DELETE FROM notes');

      // Verify audit event
      expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO audit_events');
      expect(mockQuery.mock.calls[2][1]?.[4]).toBe('note.deleted');
    });

    it('should return false when note does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });
});
