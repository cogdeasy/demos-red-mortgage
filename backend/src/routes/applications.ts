import { Router, Request, Response } from 'express';
import { applicationService } from '../services/application-service';
import { CreateApplicationSchema, UpdateApplicationSchema, SubmitApplicationSchema } from '../models/application';
import { ZodError } from 'zod';

const router = Router();

// GET /api/v1/applications — List applications with filtering, search, and sort
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, email, search, sort_by, sort_order, page, limit } = req.query;
    const result = await applicationService.list({
      status: status as string | undefined,
      email: email as string | undefined,
      search: search as string | undefined,
      sort_by: sort_by as string | undefined,
      sort_order: sort_order as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid sort column')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error listing applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/applications/stats — Dashboard statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await applicationService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/applications/:id — Get application by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const application = await applicationService.getById(req.params.id);
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application);
  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/applications — Create new application
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateApplicationSchema.parse(req.body);
    const application = await applicationService.create(data);
    res.status(201).json(application);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/applications/:id — Update application
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = UpdateApplicationSchema.parse(req.body);
    const application = await applicationService.update(req.params.id, data);
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/applications/:id/submit — Submit application for review
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const existing = await applicationService.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    // Validate required fields for submission
    SubmitApplicationSchema.parse(existing);

    const application = await applicationService.submit(req.params.id);
    res.json(application);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Application incomplete — missing required fields for submission',
        details: error.errors,
      });
      return;
    }
    if (error instanceof Error) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/applications/:id/decide — Underwriter decision
router.post('/:id/decide', async (req: Request, res: Response) => {
  try {
    const { decision, reason, underwriter } = req.body;
    if (!decision || !reason || !underwriter) {
      res.status(400).json({ error: 'Missing required fields: decision, reason, underwriter' });
      return;
    }
    if (!['approved', 'conditionally_approved', 'declined'].includes(decision)) {
      res.status(400).json({ error: 'Invalid decision. Must be: approved, conditionally_approved, or declined' });
      return;
    }
    const application = await applicationService.decide(req.params.id, decision, reason, underwriter);
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application);
  } catch (error) {
    if (error instanceof Error) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('Error deciding application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/applications/:id/audit — Get audit trail
router.get('/:id/audit', async (req: Request, res: Response) => {
  try {
    const events = await applicationService.getAuditTrail(req.params.id);
    res.json({ data: events });
  } catch (error) {
    console.error('Error getting audit trail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
