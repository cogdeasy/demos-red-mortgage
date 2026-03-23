import { Router, Request, Response } from 'express';
import { creditCheckService } from '../services/credit-check-service';
import { applicationService } from '../services/application-service';
import { ConflictError } from '../errors';

const router = Router();

// POST /api/v1/applications/:id/credit-check — Run credit check for an application
router.post('/:id/credit-check', async (req: Request, res: Response) => {
  try {
    const application = await applicationService.getById(req.params.id);
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (application.status === 'draft') {
      res.status(400).json({ error: 'Cannot run credit check on a draft application. Submit the application first.' });
      return;
    }

    if (
      !application.applicant_annual_income ||
      !application.applicant_employment_status ||
      !application.property_value
    ) {
      res.status(400).json({
        error: 'Application is missing required fields for credit check: annual income, employment status, and property value',
      });
      return;
    }

    const result = await creditCheckService.runCheck({
      application_id: application.id,
      applicant_annual_income: Number(application.applicant_annual_income),
      applicant_employment_status: application.applicant_employment_status,
      loan_amount: Number(application.loan_amount),
      property_value: Number(application.property_value),
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('Error running credit check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/applications/:id/credit-check — Get credit check result for an application
router.get('/:id/credit-check', async (req: Request, res: Response) => {
  try {
    const application = await applicationService.getById(req.params.id);
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const creditCheck = await creditCheckService.getByApplicationId(req.params.id);
    if (!creditCheck) {
      res.status(404).json({ error: 'No credit check found for this application' });
      return;
    }

    res.json(creditCheck);
  } catch (error) {
    console.error('Error getting credit check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
