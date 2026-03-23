import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { Note } from '../models/application';

export class NoteService {
  async create(applicationId: string, data: {
    author: string;
    content: string;
    note_type: string;
  }): Promise<Note> {
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO notes (id, application_id, author, content, note_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, applicationId, data.author, data.content, data.note_type || 'general']
    );

    // Emit audit event
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), applicationId, 'note', id, 'note.created', data.author,
       JSON.stringify({ content: data.content, note_type: data.note_type }),
       JSON.stringify({ source: 'api' })]
    );

    return result.rows[0];
  }

  async listByApplication(applicationId: string, noteType?: string): Promise<Note[]> {
    if (noteType) {
      const result = await pool.query(
        'SELECT * FROM notes WHERE application_id = $1 AND note_type = $2 ORDER BY created_at DESC',
        [applicationId, noteType]
      );
      return result.rows;
    }

    const result = await pool.query(
      'SELECT * FROM notes WHERE application_id = $1 ORDER BY created_at DESC',
      [applicationId]
    );
    return result.rows;
  }

  async getById(id: string): Promise<Note | null> {
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const note = await this.getById(id);
    if (!note) return false;

    await pool.query('DELETE FROM notes WHERE id = $1', [id]);

    // Emit audit event
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), note.application_id, 'note', id, 'note.deleted', note.author,
       JSON.stringify({ content: note.content, note_type: note.note_type }),
       JSON.stringify({ source: 'api' })]
    );

    return true;
  }
}

export const noteService = new NoteService();
