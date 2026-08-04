# Database guide

## Technology and conventions

The ERP uses PostgreSQL through Drizzle ORM. Tables and relations live in `lib/db/src/schema/`; `lib/db/src/index.ts` exports the shared client. Names use snake_case in PostgreSQL and camelCase in TypeScript.

## Main table groups

- Identity and authorization: users, roles, permissions, role-permissions, auth sessions
- Academic operations: students, faculty, departments, courses, semesters, attendance, assignments, examinations, marks
- Services: books, borrowing, fees, notices, notifications
- Admissions: applications, applicant sessions, documents, events, interviews, tests, assignments
- Placement: companies, jobs, applications, drives, registrations, interviews, offers, resumes, alumni
- Parent services: parent-student links, messages, appointments, leave requests, notifications
- Integrations: connections, queue, jobs, audit, webhooks, API keys, backups, payments
- AI and reporting: conversations, prompts, documents, usage, and report-supporting records

## Keys, relationships, and integrity

Tables use serial or generated primary keys. Foreign keys connect domain records to users and parent records to linked students. Sensitive dependent records use explicit `onDelete` behavior such as cascade or set-null where appropriate. Unique constraints prevent duplicate sessions, API-key hashes, storage keys, and role-permission pairs.

## RBAC

Roles and permissions are stored in the database. Requests authenticate a user session, then centralized authorization checks the required permission before domain handlers run. Domain routes additionally enforce ownership or linked-student scope.

## Indexes

Indexes cover active session lookup, parent ownership and status queries, integration queue/job status and scheduling, and audit timestamp/actor access. Add an index only when it matches a real query path and verify the query plan against representative data.

## Schema workflow

```bash
pnpm --filter @workspace/db run push
```

This is intended for development and schema validation. Production changes must use the approved deployment migration process. Never edit production data manually to bypass a constraint.