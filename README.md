# [Hero banner placeholder](docs/SCREENSHOTS.md)

# Enterprise College ERP

Enterprise College ERP Version 2 is an enterprise-ready university resource planning platform for managing academic operations, administration, admissions, placements, parent services, reporting, AI-assisted workflows, and integrations from a unified application.

## Repository Status

- **Current release:** Stable Release v2.0.0
- **Version:** 2.0.0
- **Release channel:** General Availability (GA)
- **Production status:** Production ready
- **Maintenance status:** Version 2 maintenance and operational support

## Badges

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-24-339933)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1)
![Production Ready](https://img.shields.io/badge/production--ready-yes-success)
![Build](https://img.shields.io/badge/build-passing-success)

## Project Overview

The ERP provides a role-aware, same-origin full-stack application for universities. A React and Vite frontend is served by an Express API, with PostgreSQL and Drizzle ORM providing shared persistent data. Authentication, database-backed sessions, centralized permissions, ownership scopes, audit records, and operational health checks support production-oriented use.

## Key Features

- Role-aware dashboards and navigation
- Database-backed authentication, sessions, and RBAC
- Academic, finance, library, admissions, placement, and parent workflows
- AI-assisted conversations and administrative tools
- Reporting, analytics, notifications, global search, and calendar export
- Provider-neutral integration queues, jobs, webhooks, payments, backups, and audit records
- Responsive and accessible shared UI primitives
- Health checks, structured logging, rate limiting, sanitized errors, and upload validation

## Enterprise Modules

- Authentication
- RBAC
- Dashboard
- Student Information
- Faculty
- Departments
- Courses
- Attendance
- Assignments
- Examinations
- Marks
- Library
- Fees
- Reports
- AI Assistant
- Admission CRM
- Placement Management
- Parent Portal
- Integration Center
- Notifications
- Analytics

## System Architecture Overview

The repository is a pnpm workspace containing a React/Vite client, an Express API server, shared API contracts and validation packages, and a Drizzle-backed PostgreSQL library. The configured full-stack workflow builds the frontend and starts one Express process that serves both the compiled SPA and `/api` routes. Protected requests pass through JWT and active-session validation, centralized authorization, and domain ownership checks.

## Technology Stack

### Frontend

React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, and Wouter.

### Backend

Node.js 24, Express 5, TypeScript, Pino, Helmet, and rate limiting.

### Database

PostgreSQL 16 and Drizzle ORM.

### Authentication

Signed JWTs, database-backed sessions, bcrypt password hashing, and database-configured RBAC.

### Build Tools

pnpm workspaces, TypeScript project references, Vite, esbuild, and Drizzle Kit.

### Deployment

The application runs through the configured `artifacts/college-erp: web` workflow and is designed for a same-origin full-stack deployment.

## Folder Structure

```text
artifacts/college-erp/   React/Vite frontend
artifacts/api-server/    Express API and workers
lib/db/                  PostgreSQL schema and Drizzle client
lib/api-spec/            API contract definitions
lib/api-zod/             Shared validation types
lib/api-client-react/    React API hooks
scripts/                 Workspace utilities
docs/                    Technical and operational documentation
```

## Installation Guide

Prerequisites:

- Node.js 24+
- pnpm
- PostgreSQL
- A configured `DATABASE_URL`

```bash
pnpm install
pnpm --filter @workspace/db run push
```

The schema push command is intended for development. Production schema changes must use the approved deployment migration process.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing and session security |
| `PORT` | Workflow-managed | HTTP server port |
| `BASE_PATH` | Frontend build | Vite artifact base path |
| `CORS_ORIGIN` | Optional | Comma-separated approved origins |
| `DEMO_MODE` | Development only | Server-side demo role switching |
| `VITE_DEMO_MODE` | Development only | Client demo controls |

Never commit secrets. Keep demo mode disabled in production.

## Database Setup

For local development:

```bash
pnpm --filter @workspace/db run push
```

Database tables, relationships, RBAC, keys, constraints, indexes, and migration guidance are documented in [docs/DATABASE.md](docs/DATABASE.md).

## Running Development

Start the full-stack ERP with the configured workflow command:

```bash
pnpm --filter @workspace/college-erp run fullstack
```

Useful verification commands:

```bash
pnpm run typecheck
pnpm --filter @workspace/college-erp run typecheck
pnpm --filter @workspace/api-server run typecheck
curl http://localhost:$PORT/api/healthz
```

## Production Build

```bash
PORT=22584 BASE_PATH=/ pnpm --filter @workspace/college-erp run build
pnpm --filter @workspace/api-server run build
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md) before publishing.

## User Roles

The platform supports database-configured roles including super admin, admin, secretary, faculty, student, parent, applicant, placement officer, recruiter, and alumni. Permissions are centrally authorized and domain routes apply ownership or linked-student scopes where required.

## Documentation Index

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Environment](docs/ENVIRONMENT.md)
- [Installation](docs/INSTALLATION.md)
- [Release Readiness](docs/RELEASE_READINESS.md)
- [Repository Structure](docs/STRUCTURE.md)
- [Screenshots guidance](docs/SCREENSHOTS.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [License](LICENSE)

## Version Timeline

```text
Version 1
   ↓
Version 2 Beta
   ↓
Version 2 Release Candidates
   ↓
Version 2 General Availability
   ↓
Version 3 (Planned)
```

## Current Release

- **Current stable version:** 2.0.0
- **Release date:** To be announced by the release owner
- **Status:** General Availability
- **Maintenance policy:** Version 2 receives maintenance, security, and operational fixes. New product scope belongs to Version 3 planning.

## Roadmap Summary

Version 3 planning may focus on deeper infrastructure integrations, expanded observability, broader automation, and additional university operations. Version 3 objectives are intentionally not part of the Version 2 implementation scope.

## Screenshots

Screenshots are documented as repository assets and placement guidance in [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md). No new screenshots are generated as part of this repository-branding phase.

## Support

For setup and operational questions, start with the [Installation](docs/INSTALLATION.md), [Environment](docs/ENVIRONMENT.md), [Deployment](docs/DEPLOYMENT.md), and [Release Readiness](docs/RELEASE_READINESS.md) guides. Report security issues privately according to [SECURITY.md](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes. Preserve existing APIs, business behavior, database relationships, RBAC, ownership rules, and workspace boundaries.

## License

Enterprise College ERP Version 2 is released under the [MIT License](LICENSE).