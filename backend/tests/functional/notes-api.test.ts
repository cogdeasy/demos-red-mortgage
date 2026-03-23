import request from 'supertest';
import app from '../../src/index';
import pool from '../../src/config/database';

jest.mock('../../src/config/database', () => {
  const mockPool = { query: jest.fn() };
  return {
    __esModule: true,
    default: mockPool,
    initDatabase: jest.fn(),
  };
});

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

describe('Notes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/applications/:id/notes', () => {
    it('should create a note and return 201', async () => {
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

      const response = await request(app)
        .post('/api/v1/applications/app-uuid/notes')
        .send({
          author: 'j.williams@hsbc.co.uk',
          content: 'Income documentation verified.',
          note_type: 'general',
        });

      expect(response.status).toBe(201);
      expect(response.body.author).toBe('j.williams@hsbc.co.uk');
      expect(response.body.content).toBe('Income documentation verified.');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/applications/app-uuid/notes')
        .send({ note_type: 'general' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .post('/api/v1/applications/app-uuid/notes')
        .send({ author: 'test@test.com', content: '', note_type: 'general' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid note_type', async () => {
      const response = await request(app)
        .post('/api/v1/applications/app-uuid/notes')
        .send({ author: 'test@test.com', content: 'Test', note_type: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/applications/:id/notes', () => {
    it('should return 200 with notes data', async () => {
      const mockNotes = [
        { id: '1', application_id: 'app-uuid', author: 'a', content: 'Note 1', note_type: 'general', created_at: '2024-01-01' },
        { id: '2', application_id: 'app-uuid', author: 'b', content: 'Note 2', note_type: 'internal', created_at: '2024-01-02' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNotes, rowCount: 2 } as never);

      const response = await request(app)
        .get('/api/v1/applications/app-uuid/notes');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].content).toBe('Note 1');
    });

    it('should filter by note_type', async () => {
      const mockNotes = [
        { id: '1', application_id: 'app-uuid', author: 'a', content: 'Internal note', note_type: 'internal', created_at: '2024-01-01' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNotes, rowCount: 1 } as never);

      const response = await request(app)
        .get('/api/v1/applications/app-uuid/notes?note_type=internal');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].note_type).toBe('internal');
    });
  });

  describe('DELETE /api/v1/notes/:id', () => {
    it('should delete a note and return 200', async () => {
      const mockNote = { id: 'note-uuid', application_id: 'app-uuid', author: 'a', content: 'Test', note_type: 'general', created_at: '2024-01-01' };

      // getById
      mockQuery.mockResolvedValueOnce({ rows: [mockNote], rowCount: 1 } as never);
      // DELETE
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
      // audit event
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const response = await request(app)
        .delete('/api/v1/notes/note-uuid');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Note deleted');
    });

    it('should return 404 for non-existent note', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const response = await request(app)
        .delete('/api/v1/notes/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Note not found');
    });
  });
});
