import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { CreditCheck, RiskBandType, getRiskBand } from '../models/credit-check';

interface CreditCheckRequest {
  application_id: string;
  applicant_annual_income: number;
  applicant_employment_status: string;
  loan_amount: number;
  property_value: number;
}

interface MockProviderResponse {
  credit_score: number;
  provider: string;
  raw_response: Record<string, unknown>;
}

export class CreditCheckService {
  /**
   * Run a credit check for the given application.
   * Enforces one-check-per-application via the UNIQUE constraint on application_id.
   * Stores the result in the credit_checks table and emits an audit event.
   */
  async runCheck(request: CreditCheckRequest): Promise<CreditCheck> {
    const existing = await this.getByApplicationId(request.application_id);
    if (existing) {
      const error = new Error(
        `Credit check already exists for application ${request.application_id}`
      );
      (error as Error & { status: number }).status = 409;
      throw error;
    }

    const providerResponse = this.callMockProvider(request);
    const riskBand = getRiskBand(providerResponse.credit_score);

    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO credit_checks (
        id, application_id, credit_score, risk_band, provider,
        request_payload, response_payload, checked_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        request.application_id,
        providerResponse.credit_score,
        riskBand,
        providerResponse.provider,
        JSON.stringify(request),
        JSON.stringify(providerResponse.raw_response),
        now,
        now,
      ]
    );

    await this.emitAuditEvent(id, request.application_id, riskBand, providerResponse.credit_score);

    return result.rows[0];
  }

  async getByApplicationId(applicationId: string): Promise<CreditCheck | null> {
    const result = await pool.query(
      'SELECT * FROM credit_checks WHERE application_id = $1',
      [applicationId]
    );
    return result.rows[0] || null;
  }

  /**
   * Mock credit check provider.
   * Generates a deterministic score based on income, LTV, and employment status.
   * In production this would call an external API via CREDIT_CHECK_API_URL.
   */
  callMockProvider(request: CreditCheckRequest): MockProviderResponse {
    const ltv = request.loan_amount / request.property_value;

    // Base score from income bracket
    let score: number;
    if (request.applicant_annual_income >= 100000) {
      score = 780;
    } else if (request.applicant_annual_income >= 75000) {
      score = 740;
    } else if (request.applicant_annual_income >= 50000) {
      score = 700;
    } else if (request.applicant_annual_income >= 30000) {
      score = 660;
    } else {
      score = 620;
    }

    // LTV adjustment
    if (ltv > 0.9) {
      score -= 60;
    } else if (ltv > 0.8) {
      score -= 30;
    } else if (ltv <= 0.6) {
      score += 20;
    }

    // Employment status adjustment
    if (request.applicant_employment_status === 'employed') {
      score += 10;
    } else if (request.applicant_employment_status === 'self-employed') {
      score -= 10;
    } else if (request.applicant_employment_status === 'unemployed') {
      score -= 80;
    }

    // Clamp to valid FICO range
    score = Math.max(300, Math.min(850, score));

    return {
      credit_score: score,
      provider: 'mock-experian',
      raw_response: {
        provider: 'mock-experian',
        version: '1.0',
        score,
        income_band: request.applicant_annual_income >= 75000 ? 'high' : 'standard',
        ltv_ratio: ltv,
        employment: request.applicant_employment_status,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async emitAuditEvent(
    creditCheckId: string,
    applicationId: string,
    riskBand: RiskBandType,
    creditScore: number
  ): Promise<void> {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        applicationId,
        'credit_check',
        creditCheckId,
        'credit_check.completed',
        'system',
        JSON.stringify({ risk_band: riskBand, credit_score: creditScore }),
        JSON.stringify({ provider: 'mock-experian', source: 'api' }),
      ]
    );
  }
}

export const creditCheckService = new CreditCheckService();
