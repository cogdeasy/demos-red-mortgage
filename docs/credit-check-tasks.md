# Credit Check / Risk Assessment — Task Breakdown

> **Note:** Jira MCP was not authorized for this workspace. Tasks are documented here as a fallback.

---

## Epic: Credit Check / Risk Assessment Service

Implement an automated credit check and risk assessment service that evaluates mortgage applicants'
creditworthiness using a deterministic scoring engine, persists results, and provides an auditable trail.

---

### Story 1: Implement `CreditCheckService.runCheck()` scoring engine

Build the core scoring engine that calculates a deterministic credit score based on applicant income,
loan-to-value ratio, and employment status, then maps the score to a FICO-like 300–850 range.

- **Status:** Done
- **File:** `backend/src/services/credit-check-service.ts`

---

### Story 2: Create `credit_checks` DB table and persistence layer

Define the `credit_checks` table with columns for score, risk band, provider, request/response payloads,
and timestamps. Add a UNIQUE constraint on `application_id` to enforce one check per application.

- **Status:** Done
- **File:** `backend/src/config/database.ts` (idempotent `CREATE TABLE IF NOT EXISTS`)

---

### Story 3: Implement risk band categorization logic (LOW / MEDIUM / HIGH / VERY_HIGH)

Map numeric credit scores to categorical risk bands: 720+ = LOW, 660–719 = MEDIUM, 600–659 = HIGH,
below 600 = VERY_HIGH. Expose as a pure function for testability.

- **Status:** Done
- **File:** `backend/src/models/credit-check.ts`

---

### Story 4: Add audit trail integration (`credit_check.completed` events)

After each credit check, insert a `credit_check.completed` audit event into the `audit_events` table
with the credit check ID, risk band, and score in the changes payload.

- **Status:** Done
- **File:** `backend/src/services/credit-check-service.ts` (`emitAuditEvent` method)

---

### Story 5: Expose Credit Check API endpoint

Create a REST endpoint `POST /api/v1/applications/:id/credit-check` that triggers a credit check for
a submitted application and returns the result. Also expose `GET` for retrieving existing results.

- **Status:** Done (implemented in this PR)
- **File:** `backend/src/routes/credit-checks.ts`, wired in `backend/src/index.ts`

---

### Story 6: Write E2E tests for the full credit check flow

Write end-to-end tests covering: happy path, scoring scenarios, idempotency, and edge-case boundary
values. Use Jest + testcontainers to spin up a real PostgreSQL instance.

- **Status:** Done (implemented in this PR)
- **File:** `backend/tests/e2e/credit-check.e2e.test.ts`
