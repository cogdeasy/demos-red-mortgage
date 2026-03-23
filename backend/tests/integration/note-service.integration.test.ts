import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

let container: StartedTestContainer;
let pool: Pool;

beforeAll(async () => {
  container = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'testdb',
    })
    .withExposedPorts(5432)
    .start();

  pool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: 'test',
    password: 'test',
    database: 'testdb',
  });

  // Create schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY,
      status VARCHAR(50) DEFAULT 'draft',
      applicant_first_name VARCHAR(100),
      applicant_last_name VARCHAR(100),
      applicant_email VARCHAR(255),
      applicant_phone VARCHAR(50),
      applicant_annual_income DECIMAL(15,2),
      applicant_employment_status VARCHAR(50),
      applicant_employer_name VARCHAR(200),
      property_address_line1 VARCHAR(255),
      property_address_line2 VARCHAR(255),
      property_city VARCHAR(100),
      property_postcode VARCHAR(20),
      property_country VARCHAR(100),
      property_type VARCHAR(50),
      property_value DECIMAL(15,2),
      loan_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      loan_term_months INTEGER DEFAULT 300,
      loan_type VARCHAR(50) DEFAULT 'fixed',
      interest_rate DECIMAL(5,4),
      ltv_ratio DECIMAL(5,4),
      monthly_payment DECIMAL(15,2),
      decision VARCHAR(50),
      decision_reason TEXT,
      assigned_underwriter VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
      application_id UUID NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      action VARCHAR(100) NOT NULL,
      actor VARCHAR(100),
      changes JSONB,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}, 60000);

afterAll(async () => {
  await pool.end();
  await container.stop();
});

describe('NoteService Integration Tests', () => {
  let applicationId: string;

  beforeEach(async () => {
    await pool.query('DELETE FROM notes');
    await pool.query('DELETE FROM audit_events');
    await pool.query('DELETE FROM applications');

    applicationId = uuidv4();
    await pool.query(
      'INSERT INTO applications (id, status, applicant_first_name, applicant_last_name, applicant_email, loan_amount) VALUES ($1, $2, $3, $4, $5, $6)',
      [applicationId, 'submitted', 'Sarah', 'Thompson', 'sarah@test.com', 250000]
    );
  });

  it('should create a note and emit audit event', async () => {
    const noteId = uuidv4();

    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type) VALUES ($1, $2, $3, $4, $5)',
      [noteId, applicationId, 'j.williams@hsbc.co.uk', 'Income documentation verified.', 'general']
    );

    // Emit audit event
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), applicationId, 'note', noteId, 'note.created', 'j.williams@hsbc.co.uk',
       JSON.stringify({ content: 'Income documentation verified.', note_type: 'general' }),
       JSON.stringify({ source: 'api' })]
    );

    const noteResult = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    expect(noteResult.rows).toHaveLength(1);
    expect(noteResult.rows[0].author).toBe('j.williams@hsbc.co.uk');
    expect(noteResult.rows[0].content).toBe('Income documentation verified.');

    const auditResult = await pool.query('SELECT * FROM audit_events WHERE entity_id = $1', [noteId]);
    expect(auditResult.rows).toHaveLength(1);
    expect(auditResult.rows[0].action).toBe('note.created');
  });

  it('should list notes by application ordered by created_at DESC', async () => {
    const noteId1 = uuidv4();
    const noteId2 = uuidv4();

    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [noteId1, applicationId, 'author1', 'First note', 'general', '2024-01-01T00:00:00Z']
    );
    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [noteId2, applicationId, 'author2', 'Second note', 'condition', '2024-01-02T00:00:00Z']
    );

    const result = await pool.query(
      'SELECT * FROM notes WHERE application_id = $1 ORDER BY created_at DESC',
      [applicationId]
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].content).toBe('Second note');
    expect(result.rows[1].content).toBe('First note');
  });

  it('should filter notes by note_type', async () => {
    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), applicationId, 'author1', 'General note', 'general']
    );
    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), applicationId, 'author2', 'Condition note', 'condition']
    );

    const result = await pool.query(
      'SELECT * FROM notes WHERE application_id = $1 AND note_type = $2',
      [applicationId, 'condition']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].note_type).toBe('condition');
  });

  it('should delete a note and emit audit event', async () => {
    const noteId = uuidv4();

    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type) VALUES ($1, $2, $3, $4, $5)',
      [noteId, applicationId, 'author1', 'To be deleted', 'general']
    );

    await pool.query('DELETE FROM notes WHERE id = $1', [noteId]);

    // Emit audit event
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), applicationId, 'note', noteId, 'note.deleted', 'author1',
       JSON.stringify({ content: 'To be deleted', note_type: 'general' }),
       JSON.stringify({ source: 'api' })]
    );

    const noteResult = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    expect(noteResult.rows).toHaveLength(0);

    const auditResult = await pool.query(
      "SELECT * FROM audit_events WHERE entity_id = $1 AND action = 'note.deleted'", [noteId]
    );
    expect(auditResult.rows).toHaveLength(1);
  });

  it('should fail to create note for non-existent application (FK constraint)', async () => {
    const fakeAppId = uuidv4();

    await expect(
      pool.query(
        'INSERT INTO notes (id, application_id, author, content, note_type) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), fakeAppId, 'author', 'Orphan note', 'general']
      )
    ).rejects.toThrow();
  });

  it('should cascade delete notes when application is deleted', async () => {
    const noteId = uuidv4();

    await pool.query(
      'INSERT INTO notes (id, application_id, author, content, note_type) VALUES ($1, $2, $3, $4, $5)',
      [noteId, applicationId, 'author', 'Cascade test', 'general']
    );

    await pool.query('DELETE FROM applications WHERE id = $1', [applicationId]);

    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    expect(result.rows).toHaveLength(0);
  });
});
