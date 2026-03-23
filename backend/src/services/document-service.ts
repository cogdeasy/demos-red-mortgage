import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { Document } from '../models/application';

export class DocumentService {
  async upload(applicationId: string, data: {
    document_type: string;
    file_name: string;
    file_size?: number;
    mime_type?: string;
    uploaded_by?: string;
  }): Promise<Document> {
    const id = uuidv4();
    const storagePath = `uploads/${applicationId}/${id}/${data.file_name}`;

    const result = await pool.query(
      `INSERT INTO documents (id, application_id, document_type, file_name, file_size, mime_type, storage_path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, applicationId, data.document_type, data.file_name, data.file_size || null,
       data.mime_type || null, storagePath, data.uploaded_by || null]
    );

    // Emit audit event
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), applicationId, 'document', id, 'document.uploaded', data.uploaded_by || 'system',
       JSON.stringify({ document_type: data.document_type, file_name: data.file_name }),
       JSON.stringify({ source: 'api' })]
    );

    return result.rows[0];
  }

  async listByApplication(applicationId: string): Promise<Document[]> {
    const result = await pool.query(
      'SELECT * FROM documents WHERE application_id = $1 ORDER BY created_at DESC',
      [applicationId]
    );
    return result.rows;
  }

  async verify(documentId: string, verifiedBy: string): Promise<Document | null> {
    const result = await pool.query(
      `UPDATE documents SET verified = true, verified_by = $1, verified_at = $2 WHERE id = $3 RETURNING *`,
      [verifiedBy, new Date().toISOString(), documentId]
    );
    if (result.rows.length === 0) return null;

    const doc = result.rows[0];
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), doc.application_id, 'document', documentId, 'document.verified', verifiedBy,
       JSON.stringify({ verified: { from: false, to: true } }),
       JSON.stringify({ source: 'underwriter_portal' })]
    );

    return doc;
  }
}

export const documentService = new DocumentService();
