# API documentation

The REST API is mounted under `/api` and uses Bearer JWT authentication for protected routes.

## Core endpoint groups

- `/auth` — login, logout, session restore, password changes, reset flow
- `/students` — student CRUD, transfer, archive, dashboard, courses
- `/faculty` — faculty directory, profiles, workload, dashboard summary
- `/departments`, `/courses`, `/semesters` — academic structure
- `/attendance` — attendance entry and summaries
- `/examinations`, `/marks` — exams, marks, reports, analytics
- `/assignments` — assignments and submissions
- `/fees` — fee records, payments, summaries
- `/library` — books and borrowing
- `/notices` — announcements and notice board
- `/dashboard` — KPIs and chart data
- `/administration` — finance/library/operations summary
- `/ai` — conversations, prompts, documents, search, settings
- `/integrations` — provider-neutral integrations, queues, jobs, payments, webhooks, API keys, backups, and health

All mutating and sensitive endpoints validate request bodies, enforce authentication, and pass through centralized RBAC authorization where a permission mapping exists.

Health check:

```text
GET /api/healthz
```

The health response includes API status, uptime, memory metrics, and an ISO timestamp. Protected integration routes require a valid bearer session and centralized RBAC authorization.