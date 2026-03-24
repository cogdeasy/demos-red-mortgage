# Design Document: Affordability Assessment Engine

| Field | Value |
| --- | --- |
| **Status** | DRAFT |
| **Author** | Devin AI (ciaran.deasy@cognition.ai) |
| **Date** | 2026-03-24 |
| **Version** | 1.0 |

## Executive Summary

Add an affordability assessment engine that evaluates whether applicants can sustainably afford their mortgage repayments by analysing income, existing debts, and essential living costs against the proposed monthly payment.
This is a mandatory requirement under FCA MCOB 11.6 rules and enables the platform to move from manual underwriter judgement to a standardised, auditable affordability decision.

## Context & Problem Statement

**Current state**: The HSBC Mortgage Platform ([cogdeasy/demos-red-mortgage](https://github.com/cogdeasy/demos-red-mortgage)) calculates LTV ratio, interest rate, and monthly payment amounts. A mock credit check service scores applicants based on income, employment status, and LTV. However, there is no structured affordability assessment — underwriters have no standardised view of whether the applicant can actually afford the mortgage after accounting for existing financial commitments.

**Problem**: Without an affordability assessment:

- The platform does not comply with FCA MCOB 11.6 requirements for responsible lending
- Underwriters cannot see a standardised income-vs-expenditure breakdown
- There is no stress-testing against potential interest rate rises (FCA requires +3% stress test)
- Affordability decisions are undocumented and inconsistent across underwriters
- The platform cannot auto-decline applications that clearly fail affordability thresholds

**Constraints**:

- Must integrate with the existing Spring Boot backend and PostgreSQL database
- Must use the existing applicant data (income, employment) already captured on the `applications` table
- Affordability results must be stored immutably in the audit trail
- API endpoints must be tightly scoped (one endpoint = one action)
- Must not break the existing submit/decide workflow

**References**:

- [Architecture Overview](https://cog-gtm.atlassian.net/wiki/spaces/HSBC/pages/65929218)
- [Design Conventions](https://cog-gtm.atlassian.net/wiki/spaces/HSBC/pages/65929240)
- [Design Document: Applicant Credit Check Integration](https://cog-gtm.atlassian.net/wiki/spaces/HSBC/pages/65830914)
- Repository: [cogdeasy/demos-red-mortgage](https://github.com/cogdeasy/demos-red-mortgage)

## Proposed Solution

### Architecture Overview

Add a new `AffordabilityService` that:

1. Accepts applicant financial details (income, existing debts, dependants, essential expenditure)
2. Calculates a comprehensive income-vs-expenditure model
3. Applies FCA stress testing (current rate + 3% buffer)
4. Produces an affordability verdict: `pass`, `marginal`, or `fail`
5. Stores the full assessment result in a new `affordability_assessments` table
6. Creates an audit event for regulatory compliance
7. Exposes results via tightly-scoped API endpoints

### Component Breakdown

| Component | Change |
| --- | --- |
| `AffordabilityService.java` | **NEW** — Affordability calculation engine, stress testing, verdict logic |
| `AffordabilityController.java` | **NEW** — API endpoints for running and retrieving assessments |
| `AffordabilityAssessment.java` (entity) | **NEW** — JPA entity for the `affordability_assessments` table |
| `AffordabilityAssessmentRepository.java` | **NEW** — Spring Data JPA repository |
| `RunAffordabilityRequest.java` (DTO) | **NEW** — Request schema for running an assessment |
| `ApplicationService.java` | **MODIFY** — Optionally trigger affordability check on submit |
| `Application detail page (frontend)` | **MODIFY** — Display affordability result card |
| `api.ts (frontend)` | **MODIFY** — Add affordability API client functions |

### Integration Points

- **Credit Check Service**: Affordability assessment can optionally incorporate the credit score risk band to adjust expenditure assumptions
- **Application submit flow**: Affordability assessment triggers after credit check completes
- **Underwriter decision flow**: Affordability verdict is displayed alongside credit score on the detail page
- **Audit trail**: All affordability events logged to `audit_events` table

## API Specification

### POST /api/v1/applications/:id/affordability

Run an affordability assessment for an application. Requires supplementary financial data not already captured on the application.

**Request body**:

```json
{
  "monthly_existing_mortgage_payments": 0,
  "monthly_unsecured_debt_payments": 150,
  "monthly_other_committed_expenditure": 200,
  "monthly_essential_living_costs": 1200,
  "number_of_dependants": 2,
  "has_other_income": false,
  "other_monthly_income": 0
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `monthly_existing_mortgage_payments` | decimal | yes | Current mortgage/rent payments |
| `monthly_unsecured_debt_payments` | decimal | yes | Credit cards, personal loans, car finance |
| `monthly_other_committed_expenditure` | decimal | yes | Child maintenance, school fees, etc. |
| `monthly_essential_living_costs` | decimal | yes | Council tax, utilities, food, transport, insurance |
| `number_of_dependants` | integer | yes | Number of financial dependants |
| `has_other_income` | boolean | no | Whether applicant has additional income sources |
| `other_monthly_income` | decimal | no | Additional monthly income (bonuses, rental, etc.) |

**Response** (201):

```json
{
  "id": "uuid",
  "application_id": "uuid",
  "gross_annual_income": 65000,
  "net_monthly_income": 4166.67,
  "total_monthly_expenditure": 1550,
  "proposed_monthly_payment": 1284.50,
  "disposable_income_after_mortgage": 1332.17,
  "income_to_expenditure_ratio": 0.68,
  "stress_tested_monthly_payment": 1587.30,
  "stress_tested_disposable_income": 1029.37,
  "stress_test_rate": 0.0725,
  "verdict": "pass",
  "verdict_reasons": [
    "Disposable income after mortgage is 32% of net income (threshold: >10%)",
    "Stress-tested payment is serviceable with positive disposable income",
    "Income-to-expenditure ratio 0.68 is within acceptable range (<0.85)"
  ],
  "assessed_at": "2026-03-24T12:00:00Z"
}
```

**Errors**:

- `400` — Missing required fields or invalid values
- `404` — Application not found
- `409` — Affordability assessment already exists for this application
- `422` — Application missing required income/property data

### GET /api/v1/applications/:id/affordability

Retrieve the affordability assessment result for an application.

**Response** (200): Same schema as POST response above.

**Errors**:

- `404` — No affordability assessment found for this application

### DELETE /api/v1/applications/:id/affordability

Delete an existing affordability assessment to allow re-assessment (e.g., after applicant updates financial details).

**Response** (204): No content.

**Errors**:

- `404` — No affordability assessment found for this application

## Data Model

### New table: `affordability_assessments`

| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID (PK) | Assessment identifier |
| `application_id` | UUID (FK, UNIQUE) | One assessment per application |
| `gross_annual_income` | DECIMAL(15,2) | Applicant's annual income (from application) |
| `net_monthly_income` | DECIMAL(15,2) | Calculated net monthly income |
| `other_monthly_income` | DECIMAL(15,2) | Additional income sources |
| `monthly_existing_mortgage_payments` | DECIMAL(15,2) | Current mortgage/rent |
| `monthly_unsecured_debt_payments` | DECIMAL(15,2) | Unsecured debts |
| `monthly_other_committed_expenditure` | DECIMAL(15,2) | Other committed costs |
| `monthly_essential_living_costs` | DECIMAL(15,2) | Essential living costs |
| `number_of_dependants` | INTEGER | Number of dependants |
| `total_monthly_expenditure` | DECIMAL(15,2) | Sum of all expenditure |
| `proposed_monthly_payment` | DECIMAL(15,2) | Mortgage payment at current rate |
| `disposable_income_after_mortgage` | DECIMAL(15,2) | Net income minus all costs |
| `income_to_expenditure_ratio` | DECIMAL(5,4) | Total outgoings / net income |
| `stress_tested_monthly_payment` | DECIMAL(15,2) | Payment at stressed rate |
| `stress_tested_disposable_income` | DECIMAL(15,2) | Disposable income at stressed rate |
| `stress_test_rate` | DECIMAL(5,4) | Interest rate used for stress test |
| `verdict` | VARCHAR(20) | `pass` / `marginal` / `fail` |
| `verdict_reasons` | JSONB | Array of human-readable reasons |
| `assessed_at` | TIMESTAMP WITH TIME ZONE | When assessment was performed |
| `created_at` | TIMESTAMP WITH TIME ZONE | Record creation time |

**Indexes**:

- `idx_affordability_application_id` on `application_id` (unique)

**Migration strategy**: Add table creation to Hibernate auto-DDL (consistent with existing pattern using `spring.jpa.hibernate.ddl-auto`). Entity class with JPA annotations handles schema.

## Non-Functional Requirements

| Requirement | Target |
| --- | --- |
| **Latency** | Assessment calculation < 100ms (all in-memory, no external calls) |
| **Accuracy** | Monthly payment calculation must match existing `ApplicationService.calculateMonthlyPayment()` to 2 decimal places |
| **Stress test** | FCA-compliant: current rate + 3.00 percentage points |
| **Idempotency** | Only one assessment per application (UNIQUE constraint); must DELETE before re-assessing |
| **Audit** | Every assessment creates an `audit_event` with action `affordability.assessed` |
| **Security** | Financial data treated as PII; no sensitive values in application logs |
| **Regulatory** | Verdict reasons must be stored for FCA examination (minimum 6-year retention) |

## Affordability Calculation Logic

### Step 1: Income Calculation

```
net_monthly_income = gross_annual_income * 0.70 / 12  (simplified tax estimate)
total_monthly_income = net_monthly_income + other_monthly_income
```

### Step 2: Expenditure Calculation

```
total_monthly_expenditure =
    monthly_existing_mortgage_payments
  + monthly_unsecured_debt_payments
  + monthly_other_committed_expenditure
  + monthly_essential_living_costs
  + (number_of_dependants * 250)  // ONS estimated cost per dependant
```

### Step 3: Disposable Income

```
disposable_income = total_monthly_income - total_monthly_expenditure - proposed_monthly_payment
income_to_expenditure_ratio = (total_monthly_expenditure + proposed_monthly_payment) / total_monthly_income
```

### Step 4: Stress Test

```
stress_test_rate = current_interest_rate + 0.03
stress_tested_payment = calculateMonthlyPayment(loan_amount, stress_test_rate, loan_term_months)
stress_tested_disposable = total_monthly_income - total_monthly_expenditure - stress_tested_payment
```

### Step 5: Verdict

| Verdict | Criteria |
| --- | --- |
| `pass` | `disposable_income > 0` AND `stress_tested_disposable > 0` AND `income_to_expenditure_ratio < 0.75` |
| `marginal` | `disposable_income > 0` AND (`stress_tested_disposable <= 0` OR `income_to_expenditure_ratio` between 0.75 and 0.85) |
| `fail` | `disposable_income <= 0` OR `income_to_expenditure_ratio >= 0.85` |

## Task Decomposition

### Task 1: Create `affordability_assessments` JPA entity and repository (S)

Add the `AffordabilityAssessment` JPA entity class and `AffordabilityAssessmentRepository` Spring Data interface to persist affordability assessment results.
This is the foundational data layer — all other tasks depend on the entity being available for persistence and queries.

### Task 2: Implement `AffordabilityService` calculation engine (M)

Build the core affordability calculation logic: income netting, expenditure aggregation, disposable income, stress testing, and verdict determination with human-readable reasons.
This service encapsulates all FCA-compliant affordability logic and reuses the existing `calculateMonthlyPayment()` method for stress-test recalculation.

### Task 3: Create affordability API endpoints (M)

Add `POST /api/v1/applications/:id/affordability`, `GET /api/v1/applications/:id/affordability`, and `DELETE /api/v1/applications/:id/affordability` with request validation and error handling.
These tightly-scoped endpoints follow the existing controller pattern and enable the frontend to trigger, display, and reset affordability assessments.

### Task 4: Display affordability result on frontend detail page (M)

Add an affordability assessment card to the application detail page showing the verdict (colour-coded), disposable income, stress test result, and a breakdown of income vs expenditure.
This gives underwriters a clear, at-a-glance view of whether the applicant can afford the mortgage before making their decision.

### Task 5: Add "Run Affordability Check" form to frontend (M)

Create a form component on the application detail page that collects the supplementary financial data (debts, expenditure, dependants) and submits it to the affordability endpoint.
This enables underwriters to input the applicant's declared expenditure data during the review process without needing a separate system.

### Task 6: Add unit tests for `AffordabilityService` (M)

Write JUnit tests covering income calculation, expenditure aggregation, stress testing, all three verdict outcomes (pass/marginal/fail), edge cases (zero income, high LTV), and audit event creation.
Full test coverage ensures the affordability logic meets FCA requirements and is regression-proof across future changes.

### Dependency Chain

```
Task 1 (Entity/Repo) --> Task 2 (Service) --> Task 3 (API endpoints) --> Task 4 (Frontend display)
                                                                      --> Task 5 (Frontend form)
                                            --> Task 6 (Tests)
```

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Simplified tax calculation (70% net) may not reflect real take-home pay | Document as configurable; allow override via `other_monthly_income` field; flag for future HMRC integration |
| ONS cost-per-dependant estimate may be outdated | Make configurable via application properties; review quarterly |
| Stress test buffer of +3% may change with FCA guidance | Parameterise as `AFFORDABILITY_STRESS_TEST_BUFFER` property, not hardcoded |
| Re-assessment after applicant data changes | DELETE endpoint allows clearing old assessment; audit trail preserves history |
| Regulatory examination of historic assessments | `verdict_reasons` stored as JSONB; `assessed_at` timestamp for point-in-time audit; 6-year retention policy on table |

## References

- **Repository**: [cogdeasy/demos-red-mortgage](https://github.com/cogdeasy/demos-red-mortgage)
- **Architecture**: [HSBC Mortgage Platform - Architecture Overview](https://cog-gtm.atlassian.net/wiki/spaces/HSBC/pages/65929218)
- **Conventions**: [HSBC Mortgage Platform - Design Conventions](https://cog-gtm.atlassian.net/wiki/spaces/HSBC/pages/65929240)
- **Related**: [Design Document: Applicant Credit Check Integration](https://cog-gtm.atlassian.net/wiki/spaces/HSBC/pages/65830914)
- **FCA MCOB 11.6**: Responsible lending rules requiring affordability assessment
- **ONS Family Spending Report**: Basis for estimated dependant costs
