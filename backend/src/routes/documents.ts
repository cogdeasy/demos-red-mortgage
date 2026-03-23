import { Router, Request, Response } from 'express';
import { documentService } from '../services/document-service';

const router = Router();

// GET /api/v1/applications/:applicationId/documents — List documents
router.get('/:applicationId/documents', async (req: Request, res: Response) => {
  try {
    const documents = await documentService.listByApplication(req.params.applicationId);
    res.json({ data: documents });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/applications/:applicationId/documents — Upload document metadata
router.post('/:applicationId/documents', async (req: Request, res: Response) => {
  try {
    const { document_type, file_name, file_size, mime_type, uploaded_by } = req.body;
    if (!document_type || !file_name) {
      res.status(400).json({ error: 'Missing required fields: document_type, file_name' });
      return;
    }
    const document = await documentService.upload(req.params.applicationId, {
      document_type, file_name, file_size, mime_type, uploaded_by,
    });
    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/documents/:id/verify — Verify a document
router.patch('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { verified_by } = req.body;
    if (!verified_by) {
      res.status(400).json({ error: 'Missing required field: verified_by' });
      return;
    }
    const document = await documentService.verify(req.params.id, verified_by);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
