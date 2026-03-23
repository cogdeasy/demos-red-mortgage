import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { Application, ApplicationStatusType, ApplicationStatus, AuditEvent } from '../models/application';

export class ApplicationService {
  async create(data: Partial<Application>): Promise<Application> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const ltvRatio = (data.property_value && data.loan_amount)
      ? data.loan_amount / data.property_value
      : null;

    const interestRate = this.calculateInterestRate(ltvRatio, data.loan_type || 'fixed');
    const monthlyPayment = this.calculateMonthlyPayment(
      data.loan_amount!,
      interestRate,
      data.loan_term_months!
    );

    const result = await pool.query(
      `INSERT INTO applications (
        id, applicant_first_name, applicant_last_name, applicant_email,
        applicant_phone, applicant_date_of_birth, applicant_annual_income,
        applicant_employment_status, applicant_employer_name,
        property_address_line1, property_address_line2, property_city,
        property_postcode, property_country, property_type, property_value,
        loan_amount, loan_term_months, loan_type, interest_rate,
        ltv_ratio, monthly_payment, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING *`,
      [
        id, data.applicant_first_name, data.applicant_last_name, data.applicant_email,
        data.applicant_phone || null, data.applicant_date_of_birth || null,
        data.applicant_annual_income || null, data.applicant_employment_status || null,
        data.applicant_employer_name || null, data.property_address_line1 || null,
        data.property_address_line2 || null, data.property_city || null,
        data.property_postcode || null, data.property_country || 'United Kingdom',
        data.property_type || null, data.property_value || null,
        data.loan_amount, data.loan_term_months, data.loan_type || 'fixed',
        interestRate, ltvRatio, monthlyPayment,
        ApplicationStatus.DRAFT, now, now,
      ]
    );

    await this.emitAuditEvent({
      application_id: id,
      entity_type: 'application',
      entity_id: id,
      action: 'application.created',
      actor: 'system',
      changes: { status: { from: null, to: 'draft' } },
      metadata: { source: 'api' },
    });

    return result.rows[0];
  }

  async getById(id: string): Promise<Application | null> {
    const result = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  private static readonly VALID_SORT_COLUMNS = new Set([
    'created_at', 'loan_amount', 'ltv_ratio', 'applicant_last_name', 'property_city',
  ]);

  async list(filters: {
    status?: string;
    email?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Application[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.email) {
      conditions.push(`applicant_email ILIKE $${paramIndex++}`);
      params.push(`%${filters.email}%`);
    }
    if (filters.search) {
      conditions.push(
        `(applicant_first_name || ' ' || applicant_last_name ILIKE $${paramIndex}
          OR applicant_email ILIKE $${paramIndex}
          OR COALESCE(property_postcode, '') ILIKE $${paramIndex}
          OR COALESCE(property_city, '') ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Validate sort column
    const sortBy = filters.sort_by && ApplicationService.VALID_SORT_COLUMNS.has(filters.sort_by)
      ? filters.sort_by
      : 'created_at';
    const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

    if (filters.sort_by && !ApplicationService.VALID_SORT_COLUMNS.has(filters.sort_by)) {
      throw new Error(`Invalid sort column: ${filters.sort_by}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM applications ${whereClause}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM applications ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
    };
  }

  async update(id: string, data: Partial<Application>): Promise<Application | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updatableFields = [
      'applicant_first_name', 'applicant_last_name', 'applicant_email',
      'applicant_phone', 'applicant_date_of_birth', 'applicant_annual_income',
      'applicant_employment_status', 'applicant_employer_name',
      'property_address_line1', 'property_address_line2', 'property_city',
      'property_postcode', 'property_country', 'property_type', 'property_value',
      'loan_amount', 'loan_term_months', 'loan_type',
    ] as const;

    for (const field of updatableFields) {
      if (field in data) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(data[field as keyof typeof data]);
      }
    }

    if (fields.length === 0) return existing;

    // Recalculate derived fields
    const propertyValue = (data.property_value ?? existing.property_value) as number | null;
    const loanAmount = (data.loan_amount ?? existing.loan_amount) as number;
    const loanTermMonths = (data.loan_term_months ?? existing.loan_term_months) as number;
    const loanType = (data.loan_type ?? existing.loan_type) as string;

    const ltvRatio = propertyValue ? loanAmount / propertyValue : existing.ltv_ratio;
    const interestRate = this.calculateInterestRate(ltvRatio, loanType);
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, loanTermMonths);

    fields.push(`ltv_ratio = $${paramIndex++}`);
    values.push(ltvRatio);
    fields.push(`interest_rate = $${paramIndex++}`);
    values.push(interestRate);
    fields.push(`monthly_payment = $${paramIndex++}`);
    values.push(monthlyPayment);
    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(id);

    const result = await pool.query(
      `UPDATE applications SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    await this.emitAuditEvent({
      application_id: id,
      entity_type: 'application',
      entity_id: id,
      action: 'application.updated',
      actor: 'system',
      changes: data as Record<string, unknown>,
      metadata: { source: 'api' },
    });

    return result.rows[0];
  }

  async submit(id: string): Promise<Application | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    if (existing.status !== ApplicationStatus.DRAFT) {
      throw new Error(`Cannot submit application in status: ${existing.status}`);
    }

    const result = await pool.query(
      `UPDATE applications SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [ApplicationStatus.SUBMITTED, new Date().toISOString(), id]
    );

    await this.emitAuditEvent({
      application_id: id,
      entity_type: 'application',
      entity_id: id,
      action: 'application.submitted',
      actor: 'applicant',
      changes: { status: { from: 'draft', to: 'submitted' } },
      metadata: { source: 'api' },
    });

    return result.rows[0];
  }

  async decide(id: string, decision: 'approved' | 'conditionally_approved' | 'declined', reason: string, underwriter: string): Promise<Application | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const validStatuses: readonly ApplicationStatusType[] = [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW];
    if (!validStatuses.includes(existing.status)) {
      throw new Error(`Cannot decide on application in status: ${existing.status}`);
    }

    const result = await pool.query(
      `UPDATE applications SET status = $1, decision = $2, decision_reason = $3,
       assigned_underwriter = $4, updated_at = $5 WHERE id = $6 RETURNING *`,
      [decision, decision, reason, underwriter, new Date().toISOString(), id]
    );

    await this.emitAuditEvent({
      application_id: id,
      entity_type: 'application',
      entity_id: id,
      action: `application.${decision}`,
      actor: underwriter,
      changes: { status: { from: existing.status, to: decision }, decision, reason },
      metadata: { source: 'underwriter_portal' },
    });

    return result.rows[0];
  }

  async getAuditTrail(applicationId: string): Promise<AuditEvent[]> {
    const result = await pool.query(
      'SELECT * FROM audit_events WHERE application_id = $1 ORDER BY created_at ASC',
      [applicationId]
    );
    return result.rows;
  }

  async getDashboardStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    avg_loan_amount: number;
    avg_ltv: number;
  }> {
    const totalResult = await pool.query('SELECT COUNT(*) FROM applications');
    const statusResult = await pool.query(
      'SELECT status, COUNT(*) as count FROM applications GROUP BY status'
    );
    const avgResult = await pool.query(
      'SELECT AVG(loan_amount) as avg_loan, AVG(ltv_ratio) as avg_ltv FROM applications'
    );

    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      by_status: byStatus,
      avg_loan_amount: parseFloat(avgResult.rows[0].avg_loan) || 0,
      avg_ltv: parseFloat(avgResult.rows[0].avg_ltv) || 0,
    };
  }

  private calculateInterestRate(ltvRatio: number | null, loanType: string): number {
    let baseRate = 0.0425; // 4.25% base rate
    if (ltvRatio !== null) {
      if (ltvRatio > 0.9) baseRate += 0.015;
      else if (ltvRatio > 0.8) baseRate += 0.005;
      else if (ltvRatio <= 0.6) baseRate -= 0.005;
    }
    if (loanType === 'variable') baseRate -= 0.003;
    if (loanType === 'tracker') baseRate -= 0.005;
    return Math.round(baseRate * 10000) / 10000;
  }

  private calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return principal / termMonths;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))
      / (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.round(payment * 100) / 100;
  }

  private async emitAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): Promise<void> {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, event.application_id, event.entity_type, event.entity_id, event.action, event.actor,
       JSON.stringify(event.changes), JSON.stringify(event.metadata)]
    );
  }
}

export const applicationService = new ApplicationService();
