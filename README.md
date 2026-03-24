# HSBC Mortgage Origination Platform

Full-stack mortgage origination platform with **Java/Spring Boot** backend and **Next.js 14** frontend.

## Architecture

- **Backend**: Java 17, Spring Boot 3.2, Spring Data JPA, PostgreSQL
- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose

## Quick Start

```bash
# Start all services with Docker Compose
docker compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Health check: http://localhost:3001/health
```

## Development

### Backend (Java/Spring Boot)

```bash
cd backend
mvn compile        # Build
mvn test           # Run tests
mvn package        # Package JAR
mvn spring-boot:run -Dspring-boot.run.profiles=seed  # Run with seed data
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev        # Dev server on :3000
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run build      # Production build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/applications` | List applications (search, filter, sort, paginate) |
| GET | `/api/v1/applications/stats` | Dashboard statistics |
| GET | `/api/v1/applications/:id` | Get application by ID |
| POST | `/api/v1/applications` | Create new application |
| PATCH | `/api/v1/applications/:id` | Update application |
| POST | `/api/v1/applications/:id/submit` | Submit for review |
| POST | `/api/v1/applications/:id/decide` | Underwriter decision |
| GET | `/api/v1/applications/:id/audit` | Audit trail |
| GET | `/api/v1/applications/:appId/documents` | List documents |
| POST | `/api/v1/applications/:appId/documents` | Upload document metadata |
| PATCH | `/api/v1/documents/:id/verify` | Verify document |
