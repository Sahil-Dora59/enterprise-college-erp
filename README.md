# Enterprise College ERP Version 2

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Status](https://img.shields.io/badge/status-stable-success)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Express](https://img.shields.io/badge/Express-5-black)

Enterprise College ERP Version 2 is a production-oriented university administration platform. It combines academic operations, admissions, placements, parent services, AI-assisted workflows, reporting, notifications, and provider-neutral integrations in one role-aware application.

## Features and modules

- Authentication, database-backed sessions, password recovery, and RBAC
- Students, faculty, departments, courses, semesters, attendance, assignments, examinations, marks, library, fees, and notices
- Admissions portal, applicant authentication, CRM, interviews, tests, documents, and analytics
- Placement management, recruiter portal, drives, applications, offers, alumni, and reports
- Parent portal with linked-student access, messaging, appointments, leave, and notifications
- AI conversations, prompts, document indexing, search, and role-aware assistants
- Reports, dashboards, global search, notification center, and Integration Center

## Architecture

The repository is a pnpm workspace. The React/Vite frontend is built first, then the Express server serves the SPA and `/api` routes from the same origin.

```text
artifacts/college-erp/   React + Vite frontend
artifacts/api-server/    Express API, auth, RBAC, workers
lib/db/                  PostgreSQL schema and Drizzle client
lib/api-spec/            API contract definitions
lib/api-zod/             Shared request/response validation
lib/api-client-react/    Generated React API hooks
scripts/                 Workspace utilities
docs/                    Operational and technical documentation
```

See [Architecture](docs/ARCHITECTURE.md) and [Structure](docs/STRUCTURE.md) for more detail.

## Technology stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Wouter
- Backend: Node.js, Express 5, TypeScript, Pino
- Database: PostgreSQL, Drizzle ORM
- Security: JWT, bcrypt, Helmet, rate limiting, centralized RBAC
- Workspace: pnpm

## Screenshots

Screenshots are stored in [`docs/screenshots/`](docs/screenshots/). Add current deployment captures here when performing browser certification.

![Login page](docs/screenshots/01_Login_Page.png)

## Installation

Prerequisites: Node.js 24+, pnpm, PostgreSQL, and a configured `DATABASE_URL`.

```bash
pnpm install
pnpm --filter @workspace/db run push
```

The schema push command is for development. Use the approved deployment migration process for production.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing and session security |
| `PORT` | Workflow-managed | HTTP server port |
| `BASE_PATH` | Frontend build | Vite artifact base path |
| `CORS_ORIGIN` | Optional | Comma-separated approved origins |
| `DEMO_MODE` | Development only | Server-side demo role switching |
| `VITE_DEMO_MODE` | Development only | Client demo controls |

Never commit credentials. Configure secrets through the workspace secret manager. Keep both demo variables disabled in production. See [Environment](docs/ENVIRONMENT.md).

## Development and verification

```bash
pnpm --filter @workspace/college-erp run fullstack
pnpm run typecheck
pnpm --filter @workspace/college-erp run typecheck
pnpm --filter @workspace/api-server run typecheck
```

The running service exposes `GET /api/healthz`. The configured workflow owns the full-stack preview; do not start a second frontend or API process.

## Production build and deployment

```bash
PORT=22584 BASE_PATH=/ pnpm --filter @workspace/college-erp run build
pnpm --filter @workspace/api-server run build
```

Follow [Installation](docs/INSTALLATION.md), [Deployment](docs/DEPLOYMENT.md), and [Release Readiness](docs/RELEASE_READINESS.md) before publishing.

## Roles

The system supports super admin, admin, secretary, faculty, student, parent, applicant, placement officer, recruiter, alumni, and other database-configured roles. Permissions are database-backed and ownership scopes are enforced by domain routes.

## Security

Security controls include signed JWTs, active-session checks, password hashing, Helmet, bounded request bodies, authentication rate limits, sanitized errors, request IDs, centralized authorization, ownership checks, upload validation, and sensitive-log redaction. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Do not change business behavior, database schema, or public APIs without an approved design and regression coverage.

## Documentation

- [API](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Environment](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Release readiness](docs/RELEASE_READINESS.md)
- [Changelog](CHANGELOG.md)

## License and support

This project is licensed under the [MIT License](LICENSE) when the license file is present. For workspace-specific support, consult the repository maintainers and operational documentation. Production incidents should follow the deployment team's incident process.

## Version history and roadmap

Version 2 is feature-complete and certified for stable release v2.0.0. Future work belongs to Version 3 planning and may include infrastructure integrations, expanded observability, and further performance optimization; it is intentionally outside the Version 2 scope.