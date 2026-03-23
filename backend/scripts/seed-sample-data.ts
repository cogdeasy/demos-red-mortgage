/**
 * Seed script to populate the mortgage database with realistic sample applications.
 * Run: npx ts-node scripts/seed-sample-data.ts
 */
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mortgage:mortgage_dev@localhost:5432/mortgage',
});

interface SampleApplication {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  annual_income: number;
  employment_status: string;
  employer_name: string;
  address_line1: string;
  city: string;
  postcode: string;
  property_type: string;
  property_value: number;
  loan_amount: number;
  loan_term_months: number;
  loan_type: string;
  status: string;
  decision?: string;
  decision_reason?: string;
  assigned_underwriter?: string;
  created_days_ago: number;
}

const sampleApplications: SampleApplication[] = [
  // Approved applications
  {
    first_name: 'Sarah', last_name: 'Thompson', email: 's.thompson@gmail.com', phone: '07700100201',
    annual_income: 95000, employment_status: 'employed', employer_name: 'Barclays Capital',
    address_line1: '42 Victoria Embankment', city: 'London', postcode: 'EC4Y 0DZ',
    property_type: 'flat', property_value: 550000, loan_amount: 385000, loan_term_months: 300,
    loan_type: 'fixed', status: 'approved', decision: 'approved',
    decision_reason: 'Strong income-to-loan ratio, stable employment at Tier 1 bank',
    assigned_underwriter: 'j.williams@hsbc.co.uk', created_days_ago: 14,
  },
  {
    first_name: 'David', last_name: 'Patel', email: 'd.patel@outlook.com', phone: '07700100202',
    annual_income: 72000, employment_status: 'employed', employer_name: 'NHS England',
    address_line1: '8 Harley Street', city: 'London', postcode: 'W1G 9QY',
    property_type: 'terraced', property_value: 425000, loan_amount: 340000, loan_term_months: 360,
    loan_type: 'fixed', status: 'approved', decision: 'approved',
    decision_reason: 'Public sector stability, LTV within acceptable range',
    assigned_underwriter: 'j.williams@hsbc.co.uk', created_days_ago: 12,
  },
  {
    first_name: 'Emma', last_name: 'Richardson', email: 'e.richardson@proton.me', phone: '07700100203',
    annual_income: 110000, employment_status: 'employed', employer_name: 'Deloitte LLP',
    address_line1: '1 New Street Square', city: 'London', postcode: 'EC4A 3HQ',
    property_type: 'flat', property_value: 720000, loan_amount: 504000, loan_term_months: 300,
    loan_type: 'fixed', status: 'approved', decision: 'approved',
    decision_reason: 'High earner, Big 4 employment, acceptable LTV at 70%',
    assigned_underwriter: 'm.chen@hsbc.co.uk', created_days_ago: 10,
  },
  {
    first_name: 'Michael', last_name: 'O\'Brien', email: 'm.obrien@yahoo.co.uk', phone: '07700100204',
    annual_income: 65000, employment_status: 'employed', employer_name: 'Rolls-Royce Holdings',
    address_line1: '15 Cathedral Close', city: 'Derby', postcode: 'DE1 3GP',
    property_type: 'semi-detached', property_value: 310000, loan_amount: 248000, loan_term_months: 300,
    loan_type: 'fixed', status: 'approved', decision: 'approved',
    decision_reason: 'Solid LTV ratio, stable aerospace employer',
    assigned_underwriter: 'j.williams@hsbc.co.uk', created_days_ago: 9,
  },
  {
    first_name: 'Priya', last_name: 'Sharma', email: 'p.sharma@gmail.com', phone: '07700100205',
    annual_income: 88000, employment_status: 'employed', employer_name: 'AstraZeneca',
    address_line1: '22 Silk Road', city: 'Cambridge', postcode: 'CB2 1TN',
    property_type: 'detached', property_value: 480000, loan_amount: 288000, loan_term_months: 240,
    loan_type: 'tracker', status: 'approved', decision: 'approved',
    decision_reason: 'Excellent LTV of 60%, strong pharma employment',
    assigned_underwriter: 'm.chen@hsbc.co.uk', created_days_ago: 8,
  },
  // Conditionally approved
  {
    first_name: 'James', last_name: 'Wilson', email: 'j.wilson@live.co.uk', phone: '07700100206',
    annual_income: 52000, employment_status: 'employed', employer_name: 'Manchester City Council',
    address_line1: '7 Deansgate', city: 'Manchester', postcode: 'M3 4LQ',
    property_type: 'terraced', property_value: 280000, loan_amount: 252000, loan_term_months: 300,
    loan_type: 'fixed', status: 'conditionally_approved', decision: 'conditionally_approved',
    decision_reason: 'LTV at 90% requires additional documentation — proof of deposit source needed',
    assigned_underwriter: 'j.williams@hsbc.co.uk', created_days_ago: 6,
  },
  {
    first_name: 'Lucy', last_name: 'Evans', email: 'l.evans@icloud.com', phone: '07700100207',
    annual_income: 78000, employment_status: 'self-employed', employer_name: 'Evans Design Studio Ltd',
    address_line1: '31 Park Place', city: 'Cardiff', postcode: 'CF10 3BS',
    property_type: 'flat', property_value: 350000, loan_amount: 280000, loan_term_months: 300,
    loan_type: 'variable', status: 'conditionally_approved', decision: 'conditionally_approved',
    decision_reason: 'Self-employed — requires 3 years of SA302 tax returns',
    assigned_underwriter: 'm.chen@hsbc.co.uk', created_days_ago: 5,
  },
  // Submitted / Under Review
  {
    first_name: 'Oliver', last_name: 'Hughes', email: 'o.hughes@gmail.com', phone: '07700100208',
    annual_income: 68000, employment_status: 'employed', employer_name: 'BAE Systems',
    address_line1: '14 Farnborough Road', city: 'Farnborough', postcode: 'GU14 6TF',
    property_type: 'semi-detached', property_value: 390000, loan_amount: 312000, loan_term_months: 300,
    loan_type: 'fixed', status: 'under_review', created_days_ago: 4,
  },
  {
    first_name: 'Aisha', last_name: 'Khan', email: 'a.khan@hotmail.co.uk', phone: '07700100209',
    annual_income: 55000, employment_status: 'employed', employer_name: 'University of Birmingham',
    address_line1: '9 Edgbaston Park Road', city: 'Birmingham', postcode: 'B15 2TT',
    property_type: 'terraced', property_value: 265000, loan_amount: 212000, loan_term_months: 360,
    loan_type: 'fixed', status: 'submitted', created_days_ago: 3,
  },
  {
    first_name: 'Thomas', last_name: 'Clarke', email: 't.clarke@gmail.com', phone: '07700100210',
    annual_income: 120000, employment_status: 'employed', employer_name: 'Goldman Sachs International',
    address_line1: '25 Shoe Lane', city: 'London', postcode: 'EC4A 4AU',
    property_type: 'flat', property_value: 850000, loan_amount: 680000, loan_term_months: 300,
    loan_type: 'fixed', status: 'submitted', created_days_ago: 3,
  },
  {
    first_name: 'Sophie', last_name: 'Bennett', email: 's.bennett@outlook.com', phone: '07700100211',
    annual_income: 62000, employment_status: 'employed', employer_name: 'John Lewis Partnership',
    address_line1: '3 Cabot Circus', city: 'Bristol', postcode: 'BS1 3BX',
    property_type: 'flat', property_value: 295000, loan_amount: 236000, loan_term_months: 300,
    loan_type: 'variable', status: 'under_review', created_days_ago: 2,
  },
  {
    first_name: 'Raj', last_name: 'Gupta', email: 'r.gupta@gmail.com', phone: '07700100212',
    annual_income: 85000, employment_status: 'contractor', employer_name: 'Cognizant Technology Solutions',
    address_line1: '17 Canary Wharf', city: 'London', postcode: 'E14 5AB',
    property_type: 'flat', property_value: 520000, loan_amount: 416000, loan_term_months: 300,
    loan_type: 'fixed', status: 'submitted', created_days_ago: 2,
  },
  // Draft applications (recently started)
  {
    first_name: 'Charlotte', last_name: 'Taylor', email: 'c.taylor@gmail.com', phone: '07700100213',
    annual_income: 48000, employment_status: 'employed', employer_name: 'Tesco PLC',
    address_line1: '6 Market Square', city: 'Leeds', postcode: 'LS1 6AE',
    property_type: 'terraced', property_value: 220000, loan_amount: 176000, loan_term_months: 300,
    loan_type: 'fixed', status: 'draft', created_days_ago: 1,
  },
  {
    first_name: 'Daniel', last_name: 'Murphy', email: 'd.murphy@proton.me', phone: '07700100214',
    annual_income: 75000, employment_status: 'employed', employer_name: 'BT Group',
    address_line1: '81 Newgate Street', city: 'London', postcode: 'EC1A 7AJ',
    property_type: 'flat', property_value: 450000, loan_amount: 360000, loan_term_months: 300,
    loan_type: 'tracker', status: 'draft', created_days_ago: 1,
  },
  {
    first_name: 'Fiona', last_name: 'MacLeod', email: 'f.macleod@gmail.com', phone: '07700100215',
    annual_income: 92000, employment_status: 'employed', employer_name: 'Royal Bank of Scotland',
    address_line1: '36 St Andrew Square', city: 'Edinburgh', postcode: 'EH2 2YB',
    property_type: 'detached', property_value: 380000, loan_amount: 266000, loan_term_months: 240,
    loan_type: 'fixed', status: 'draft', created_days_ago: 0,
  },
  // Declined application
  {
    first_name: 'Mark', last_name: 'Stevens', email: 'm.stevens@yahoo.co.uk', phone: '07700100216',
    annual_income: 32000, employment_status: 'employed', employer_name: 'Wetherspoons',
    address_line1: '44 High Street', city: 'Watford', postcode: 'WD17 2BS',
    property_type: 'flat', property_value: 250000, loan_amount: 237500, loan_term_months: 360,
    loan_type: 'fixed', status: 'declined', decision: 'declined',
    decision_reason: 'LTV exceeds 95%, income-to-loan ratio too high at 7.4x',
    assigned_underwriter: 'j.williams@hsbc.co.uk', created_days_ago: 7,
  },
  // More variety
  {
    first_name: 'Hannah', last_name: 'Roberts', email: 'h.roberts@gmail.com', phone: '07700100217',
    annual_income: 58000, employment_status: 'employed', employer_name: 'Airbus UK',
    address_line1: '12 Broughton Lane', city: 'Chester', postcode: 'CH4 0DR',
    property_type: 'semi-detached', property_value: 320000, loan_amount: 256000, loan_term_months: 300,
    loan_type: 'fixed', status: 'approved', decision: 'approved',
    decision_reason: 'Solid employment, LTV at 80% acceptable with income level',
    assigned_underwriter: 'm.chen@hsbc.co.uk', created_days_ago: 11,
  },
  {
    first_name: 'William', last_name: 'Foster', email: 'w.foster@outlook.com', phone: '07700100218',
    annual_income: 145000, employment_status: 'employed', employer_name: 'McKinsey & Company',
    address_line1: '1 Jermyn Street', city: 'London', postcode: 'SW1Y 4UH',
    property_type: 'flat', property_value: 950000, loan_amount: 665000, loan_term_months: 300,
    loan_type: 'fixed', status: 'approved', decision: 'approved',
    decision_reason: 'High earner, LTV 70%, premium consulting firm employment',
    assigned_underwriter: 'j.williams@hsbc.co.uk', created_days_ago: 15,
  },
  {
    first_name: 'Amara', last_name: 'Osei', email: 'a.osei@gmail.com', phone: '07700100219',
    annual_income: 67000, employment_status: 'employed', employer_name: 'Transport for London',
    address_line1: '55 Broadway', city: 'London', postcode: 'SW1H 0BD',
    property_type: 'flat', property_value: 380000, loan_amount: 304000, loan_term_months: 300,
    loan_type: 'fixed', status: 'submitted', created_days_ago: 1,
  },
  {
    first_name: 'George', last_name: 'Wright', email: 'g.wright@icloud.com', phone: '07700100220',
    annual_income: 82000, employment_status: 'employed', employer_name: 'Jaguar Land Rover',
    address_line1: '28 Corporation Street', city: 'Coventry', postcode: 'CV1 1GF',
    property_type: 'detached', property_value: 410000, loan_amount: 328000, loan_term_months: 300,
    loan_type: 'tracker', status: 'under_review', created_days_ago: 3,
  },
];

function calculateInterestRate(ltvRatio: number | null, loanType: string): number {
  let baseRate = 0.0425;
  if (ltvRatio !== null) {
    if (ltvRatio > 0.9) baseRate += 0.015;
    else if (ltvRatio > 0.8) baseRate += 0.005;
    else if (ltvRatio <= 0.6) baseRate -= 0.005;
  }
  if (loanType === 'variable') baseRate -= 0.003;
  if (loanType === 'tracker') baseRate -= 0.005;
  return Math.round(baseRate * 10000) / 10000;
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))
    / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}

async function seed() {
  console.log('Seeding sample mortgage applications...');

  // Clear existing data
  await pool.query('DELETE FROM audit_events');
  await pool.query('DELETE FROM documents');
  await pool.query('DELETE FROM notes');
  await pool.query('DELETE FROM applications');

  for (const app of sampleApplications) {
    const id = uuidv4();
    const ltvRatio = app.loan_amount / app.property_value;
    const interestRate = calculateInterestRate(ltvRatio, app.loan_type);
    const monthlyPayment = calculateMonthlyPayment(app.loan_amount, interestRate, app.loan_term_months);
    const createdAt = new Date(Date.now() - app.created_days_ago * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO applications (
        id, applicant_first_name, applicant_last_name, applicant_email,
        applicant_phone, applicant_annual_income, applicant_employment_status,
        applicant_employer_name, property_address_line1, property_city,
        property_postcode, property_country, property_type, property_value,
        loan_amount, loan_term_months, loan_type, interest_rate, ltv_ratio,
        monthly_payment, status, decision, decision_reason, assigned_underwriter,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      )`,
      [
        id, app.first_name, app.last_name, app.email,
        app.phone, app.annual_income, app.employment_status,
        app.employer_name, app.address_line1, app.city,
        app.postcode, 'United Kingdom', app.property_type, app.property_value,
        app.loan_amount, app.loan_term_months, app.loan_type, interestRate, ltvRatio,
        monthlyPayment, app.status, app.decision || null, app.decision_reason || null,
        app.assigned_underwriter || null, createdAt, createdAt,
      ]
    );

    // Add audit events
    await pool.query(
      `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata, created_at)
       VALUES ($1, $2, 'application', $2, 'application.created', 'system', $3, $4, $5)`,
      [uuidv4(), id, JSON.stringify({ status: { from: null, to: 'draft' } }),
       JSON.stringify({ source: 'api' }), createdAt]
    );

    if (['submitted', 'under_review', 'approved', 'conditionally_approved', 'declined'].includes(app.status)) {
      const submittedAt = new Date(new Date(createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
      await pool.query(
        `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata, created_at)
         VALUES ($1, $2, 'application', $2, 'application.submitted', 'applicant', $3, $4, $5)`,
        [uuidv4(), id, JSON.stringify({ status: { from: 'draft', to: 'submitted' } }),
         JSON.stringify({ source: 'api' }), submittedAt]
      );
    }

    if (['approved', 'conditionally_approved', 'declined'].includes(app.status) && app.decision) {
      const decidedAt = new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
      await pool.query(
        `INSERT INTO audit_events (id, application_id, entity_type, entity_id, action, actor, changes, metadata, created_at)
         VALUES ($1, $2, 'application', $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), id, `application.${app.decision}`, app.assigned_underwriter || 'underwriter',
         JSON.stringify({ status: { from: 'submitted', to: app.decision }, decision: app.decision, reason: app.decision_reason }),
         JSON.stringify({ source: 'underwriter_portal' }), decidedAt]
      );
    }

    console.log(`  Created: ${app.first_name} ${app.last_name} — ${app.status} — ${app.city} — £${app.loan_amount.toLocaleString()}`);
  }

  console.log(`\nSeeded ${sampleApplications.length} applications successfully.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
