import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mortgage:mortgage_dev@localhost:5432/mortgage',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY,
        applicant_first_name VARCHAR(100) NOT NULL,
        applicant_last_name VARCHAR(100) NOT NULL,
        applicant_email VARCHAR(255) NOT NULL,
        applicant_phone VARCHAR(20),
        applicant_date_of_birth DATE,
        applicant_annual_income DECIMAL(15,2),
        applicant_employment_status VARCHAR(50),
        applicant_employer_name VARCHAR(200),
        property_address_line1 VARCHAR(255),
        property_address_line2 VARCHAR(255),
        property_city VARCHAR(100),
        property_postcode VARCHAR(20),
        property_country VARCHAR(100) DEFAULT 'United Kingdom',
        property_type VARCHAR(50),
        property_value DECIMAL(15,2),
        loan_amount DECIMAL(15,2) NOT NULL,
        loan_term_months INTEGER NOT NULL,
        loan_type VARCHAR(50) NOT NULL DEFAULT 'fixed',
        interest_rate DECIMAL(5,4),
        ltv_ratio DECIMAL(5,4),
        monthly_payment DECIMAL(15,2),
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        decision VARCHAR(50),
        decision_reason TEXT,
        assigned_underwriter VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        storage_path VARCHAR(500),
        uploaded_by VARCHAR(100),
        verified BOOLEAN DEFAULT FALSE,
        verified_by VARCHAR(100),
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        note_type VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY,
        application_id UUID REFERENCES applications(id),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor VARCHAR(100),
        changes JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_checks (
        id UUID PRIMARY KEY,
        application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
        credit_score INTEGER NOT NULL,
        risk_band VARCHAR(20) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        request_payload JSONB,
        response_payload JSONB,
        checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
      CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(applicant_email);
      CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
      CREATE INDEX IF NOT EXISTS idx_notes_application_id ON notes(application_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_application_id ON audit_events(application_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_checks_application_id ON credit_checks(application_id);
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

export default pool;
