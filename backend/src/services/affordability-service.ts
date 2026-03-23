import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AffordabilityCheck, Application } from '../models/application';
import { ConflictError } from '../errors';

export class AffordabilityService {
  /**
   * Run an affordability assessment for the given application.
   * Enforces one-check-per-application via the UNIQUE constraint on application_id.
   */
  async runAssessment(applicationId: string): Promise<AffordabilityCheck> {
    const existing = await this.getAssessment(applicationId);
    if (existing) {
      throw new ConflictError(
        `Affordability check already exists for application ${applicationId}`
      );
    }

    const appResult = await pool.query('SELECT * FROM applications WHERE id = $1', [applicationId]);
    const application: Application | undefined = appResult.rows[0];
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const annualIncome = Number(application.applicant_annual_income) || 0;
    const grossMonthlyIncome = annualIncome / 12;

    const monthlyRentOrMortgage = Number(application.monthly_rent_or_mortgage) || 0;
    const monthlyCreditCommitments = Number(application.monthly_credit_commitments) || 0;
    const monthlyLivingCosts = Number(application.monthly_living_costs) || 0;
    const declaredMonthlyOutgoings = monthlyRentOrMortgage + monthlyCreditCommitments + monthlyLivingCosts;

    const interestRate = Number(application.interest_rate) || 0.0425;
    const loanAmount = Number(application.loan_amount);
    const termMonths = application.loan_term_months;

    const mortgagePaymentCurrent = this.calculateMonthlyPayment(loanAmount, interestRate, termMonths);
    const stressedRate = interestRate + 0.03;
    const mortgagePaymentStressed = this.calculateMonthlyPayment(loanAmount, stressedRate, termMonths);

    let dtiCurrent = 0;
    let dtiStressed = 0;
    if (grossMonthlyIncome > 0) {
      dtiCurrent = (declaredMonthlyOutgoings + mortgagePaymentCurrent) / grossMonthlyIncome;
      dtiStressed = (declaredMonthlyOutgoings + mortgagePaymentStressed) / grossMonthlyIncome;
    } else {
      // Zero income means infinite DTI — automatic fail
      dtiCurrent = 9.9999;
      dtiStressed = 9.9999;
    }

    let verdict: string;
    let verdictReason: string;
    if (dtiStressed <= 0.45) {
      verdict = 'pass';
      verdictReason = `Stressed DTI ratio of ${(dtiStressed * 100).toFixed(1)}% is within the 45% threshold. The applicant can comfortably afford repayments even under stressed conditions.`;
    } else if (dtiStressed <= 0.55) {
      verdict = 'marginal';
      verdictReason = `Stressed DTI ratio of ${(dtiStressed * 100).toFixed(1)}% exceeds the 45% comfort threshold but is within the 55% upper limit. The applicant may face difficulty if interest rates rise further.`;
    } else {
      verdict = 'fail';
      verdictReason = `Stressed DTI ratio of ${(dtiStressed * 100).toFixed(1)}% exceeds the 55% maximum threshold. The applicant cannot afford repayments under stressed conditions.`;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    let result;
    try {
      result = await pool.query(
        `INSERT INTO affordability_checks (
          id, application_id, gross_monthly_income, declared_monthly_outgoings,
          mortgage_payment_current, mortgage_payment_stressed,
          dti_ratio_current, dti_ratio_stressed,
          verdict, verdict_reason, checked_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          id,
          applicationId,
          Math.round(grossMonthlyIncome * 100) / 100,
          Math.round(declaredMonthlyOutgoings * 100) / 100,
          Math.round(mortgagePaymentCurrent * 100) / 100,
          Math.round(mortgagePaymentStressed * 100) / 100,
          Math.round(dtiCurrent * 10000) / 10000,
          Math.round(dtiStressed * 10000) / 10000,
          verdict,
          verdictReason,
          now,
        ]
      );
    } catch (err: unknown) {
      const dbError = err as { code?: string };
      if (dbError.code === '23505') {
        throw new ConflictError(
          `Affordability check already exists for application ${applicationId}`
        );
      }
      throw err;
    }

    await this.emitAuditEvent(id, applicationId, verdict, dtiStressed);

    return result.rows[0];
  }

  async getAssessment(applicationId: string): Promise<AffordabilityCheck | null> {
    const result = await pool.query(
      'SELECT * FROM affordability_checks WHERE application_id = $1',
      [applicationId]
    );
    return result.rows[0] || null;
  }

  private calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return principal / termMonths;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))
      / (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.round(payment * 100) / 100;
  }

  private async emitAuditEvent(
    affordabilityCheckId: string,
    applicationId: string,
    verdict: string,
    dtiStressed: number
  ): Promise<void> {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        applicationId,
        'affordability_check',
        affordabilityCheckId,
        'affordability_check.completed',
        'system',
        JSON.stringify({ verdict, dti_ratio_stressed: dtiStressed }),
        JSON.stringify({ source: 'api' }),
      ]
    );
  }
}

export const affordabilityService = new AffordabilityService();
