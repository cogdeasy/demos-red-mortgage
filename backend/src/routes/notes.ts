import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ZodError } from 'zod';
import { noteService } from '../services/note-service';

const router = Router();

const CreateNoteSchema = z.object({
  author: z.string().min(1).max(100),
  content: z.string().min(1),
  note_type: z.enum(['general', 'internal', 'condition', 'follow_up']).default('general'),
});

// GET /api/v1/applications/:applicationId/notes — List notes for an application
router.get('/:applicationId/notes', async (req: Request, res: Response) => {
  try {
    const noteType = req.query.note_type as string | undefined;
    const notes = await noteService.listByApplication(req.params.applicationId, noteType);
    res.json({ data: notes });
  } catch (error) {
    console.error('Error listing notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/applications/:applicationId/notes — Create a note
router.post('/:applicationId/notes', async (req: Request, res: Response) => {
  try {
    const data = CreateNoteSchema.parse(req.body);
    const note = await noteService.create(req.params.applicationId, data);
    res.status(201).json(note);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/notes/:id — Delete a note
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await noteService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
