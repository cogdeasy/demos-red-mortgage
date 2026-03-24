# Design Document: Mortgage Origination Platform v2 Enhancements

- **Status**: DRAFT
- **Author**: Devin (devin@cognition.ai)
- **Date**: 2026-03-24
- **Version**: 1.0

---

## 1. Executive Summary

The current mortgage origination platform has a solid foundation but is missing several key features that would make it production-viable. This document proposes completing the unused Note and Credit Check subsystems, adding application withdrawal and under-review transitions, and enhancing the frontend with notes, documents, credit check display, and pagination.

---

## 2. Context & Problem Statement

### Current State
- **Backend**: Java 17, Spring Boot 3.2, Spring Data JPA, PostgreSQL with 5 entities (Application, Document, CreditCheck, AuditEvent, Note), 3 services, 3 controllers
- **Frontend**: Next.js 14, React 18, TypeScript with 3 pages (dashboard, new application, application detail)
- **Workflow**: create (draft) -> submit -> decide (approve/conditionally_approve/decline)

### Problems Identified

#### Critical Gaps
1. **Note entity is completely unused** -- the `Note` entity and `notes` table exist but there is no NoteRepository, NoteService, or NoteController. Underwriters and applicants have no way to annotate applications.
2. **CreditCheckService exists but has no API endpoint** -- the service is fully implemented with mock scoring logic but is never exposed via a controller. Credit checks cannot be triggered via the API.
3. **No application withdrawal flow** -- applicants cannot withdraw submitted applications. There is a `withdrawn` CSS badge style but no backend support.
4. **No explicit `under_review` transition** -- applications jump from `submitted` to a decision with no way for underwriters to indicate they've picked up an application for review.

#### Frontend Gaps
5. **No notes UI** -- the application detail page has no way to view or add notes.
6. **No credit check display** -- credit score and risk band are never shown to the underwriter.
7. **No document management UI** -- the detail page shows no document list despite the backend supporting it.
8. **No pagination** -- backend supports pagination but the dashboard fetches only the first page with no navigation controls.

#### Code Quality Issues
9. **Hard-coded underwriter email** -- the frontend uses `'underwriter@demo.com'` in the decide flow instead of letting the user enter one.
10. **Duplicated interest rate/payment calculation logic** -- `DataSeeder.calcRate` and `ApplicationService.calculateInterestRate` are identical but separate implementations.

### Constraints
- Must remain backward-compatible with existing API consumers
- No authentication system currently exists -- that is out of scope for this iteration
- Credit check remains a mock (no real Experian integration)

### References
- Source repo: `cogdeasy/demos-red-mortgage`

---

## 3. Proposed Solution

### High-Level Architecture

No architectural changes. All additions are new endpoints, a new controller, and frontend components on existing pages. The data model only requires one new repository interface (NoteRepository).

### Component Breakdown

#### Backend Additions
| Component | Type | Description |
|---|---|---|
| `NoteRepository` | Repository | JPA repository for Note entity |
| `NoteService` | Service | CRUD operations for application notes |
| `NoteController` | Controller | REST endpoints for notes |
| `CreditCheckController` | Controller | REST endpoints exposing existing CreditCheckService |
| `ApplicationService.withdraw()` | Method | Withdraw an application |
| `ApplicationService.startReview()` | Method | Move application to under_review |

#### Frontend Additions
| Component | Page | Description |
|---|---|---|
| Notes tab | Application Detail | List and add notes |
| Credit Check card | Application Detail | Display credit score and risk band |
| Documents card | Application Detail | List uploaded documents |
| Pagination controls | Dashboard | Navigate pages of applications |
| Underwriter input | Application Detail | Input field for underwriter email on decisions |

---

## 4. API Specification

### 4.1 Notes Endpoints

#### GET `/api/v1/applications/:appId/notes`
List all notes for an application.

- **Response**: `{ "data": Note[] }`
- **Error**: 404 if application not found

#### POST `/api/v1/applications/:appId/notes`
Add a note to an application.

- **Request**:
  ```json
  {
    "author": "string (required)",
    "content": "string (required)",
    "note_type": "string (optional, default: general)"
  }
  ```
- **Response**: 201 Created, Note object
- **Error**: 400 if missing required fields

### 4.2 Credit Check Endpoints

#### POST `/api/v1/applications/:appId/credit-check`
Trigger a credit check for an application.

- **Response**: 201 Created, CreditCheck object
- **Error**: 404 if application not found, 409 if credit check already exists

#### GET `/api/v1/applications/:appId/credit-check`
Get the credit check result for an application.

- **Response**: CreditCheck object or 404

### 4.3 Application Lifecycle Endpoints

#### POST `/api/v1/applications/:id/withdraw`
Withdraw an application (only from draft or submitted status).

- **Response**: 200 OK, updated Application
- **Error**: 409 if application cannot be withdrawn from current status

#### POST `/api/v1/applications/:id/review`
Move an application to under_review (only from submitted status).

- **Request**:
  ```json
  {
    "underwriter": "string (required)"
  }
  ```
- **Response**: 200 OK, updated Application
- **Error**: 409 if not in submitted status

---

## 5. Data Model

### Existing Tables (no schema changes)
- `notes` -- already exists, currently unused
- `credit_checks` -- already exists, currently unused from API

### New Repository Interface
- `NoteRepository extends JpaRepository<Note, UUID>` with `findByApplicationIdOrderByCreatedAtDesc(UUID appId)`

No database migrations required -- all tables already exist via JPA auto-DDL.

---

## 6. Non-Functional Requirements

- **Performance**: All new endpoints should respond in <200ms for typical payloads
- **Security**: CORS remains open for this iteration (auth is out of scope)
- **Scalability**: No changes -- existing JPA/PostgreSQL patterns apply
- **Observability**: All state changes emit audit events (consistent with existing pattern)

---

## 7. Task Decomposition

### Task 1: Notes API (Size: M)
Complete the unused Note subsystem by adding NoteRepository, NoteService, NoteController, and unit tests. This enables underwriters and applicants to annotate applications with comments.

- [ ] Create `NoteRepository` interface
- [ ] Create `NoteService` with list/create methods
- [ ] Create `NoteController` with GET/POST endpoints
- [ ] Add unit tests for `NoteService`
- AC: POST creates a note and returns 201; GET returns all notes ordered by creation time

### Task 2: Credit Check API (Size: S)
Expose the existing CreditCheckService via a new CreditCheckController. The service logic already exists and is tested; only the HTTP layer is missing.

- [ ] Create `CreditCheckController` with POST (trigger) and GET (retrieve) endpoints
- AC: POST triggers a credit check and returns 201; GET returns the result or 404

### Task 3: Application Withdrawal (Size: S)
Add a withdraw endpoint and service method. Only draft or submitted applications can be withdrawn. Emits an audit event.

- [ ] Add `withdraw()` method to ApplicationService
- [ ] Add POST `/{id}/withdraw` endpoint to ApplicationController
- [ ] Add unit test
- AC: Withdrawing a draft/submitted app returns 200 with status=withdrawn; withdrawing any other status returns 409

### Task 4: Under-Review Transition (Size: S)
Add an explicit transition for underwriters to pick up submitted applications. Records the assigned underwriter and emits an audit event.

- [ ] Add `startReview()` method to ApplicationService
- [ ] Add POST `/{id}/review` endpoint to ApplicationController
- [ ] Add unit test
- AC: Moving a submitted app to under_review returns 200; other statuses return 409

### Task 5: Frontend -- Notes Tab (Size: M)
Add a notes section to the application detail page. Shows existing notes in a timeline and provides a form to add new notes.

- [ ] Add notes API methods to `api.ts`
- [ ] Add notes section to application detail page
- AC: Notes are displayed chronologically; new notes appear after submission

### Task 6: Frontend -- Credit Check Display (Size: S)
Add a credit check card to the application detail page. Shows credit score, risk band, and provider. Includes a button to trigger a credit check if none exists.

- [ ] Add credit check API methods to `api.ts`
- [ ] Add credit check card to application detail page
- AC: Credit check card shows score and risk band when available; trigger button works

### Task 7: Frontend -- Documents List (Size: S)
Add a documents card to the application detail page showing uploaded documents.

- [ ] Add documents API methods to `api.ts`
- [ ] Add documents card to application detail page
- AC: Document list is displayed with type, filename, and verification status

### Task 8: Frontend -- Pagination (Size: S)
Add pagination controls to the dashboard application list.

- [ ] Add pagination state and controls to dashboard page
- [ ] Wire up page changes to API calls
- AC: Users can navigate between pages of applications

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Unused Note/CreditCheck tables may have schema drift from entity definitions | Low | Medium | JPA auto-DDL will reconcile; H2 test DB validates schema |
| Credit check mock may confuse users who expect real scores | Medium | Low | Provider is labeled "mock-experian" in UI |
| No auth means anyone can withdraw or approve | High | High | Out of scope for this iteration; documented as known limitation |

---

## 9. References

- Source repo: https://github.com/cogdeasy/demos-red-mortgage
- Existing API docs: See README.md in repo root
