# Enterprise College ERP System

A production-oriented college operations platform for managing students, faculty, academics, attendance, examinations, fees, library circulation, and notices.

## Run & Operate

- `pnpm --filter @workspace/college-erp run dev` — run the React/Vite frontend
- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/college-erp` — React/Vite web application and role-aware ERP screens
- `artifacts/api-server` — Express API routes, JWT authentication, and dashboard queries
- `lib/db/src/schema` — Drizzle PostgreSQL schema
- `lib/api-spec/openapi.yaml` — source-of-truth REST contract
- `lib/api-client-react` and `lib/api-zod` — generated API hooks and validation types

## Architecture decisions

- JWT authentication uses the `SESSION_SECRET` environment secret; tokens are stored in the browser as `erp_token`.
- OpenAPI is the source of truth; regenerate client hooks and Zod schemas after contract changes.
- The API is shared by the web artifact and binds to the configured `PORT`.
- Database access uses the existing PostgreSQL database through Drizzle ORM.

## Product

The ERP provides role-aware dashboards and CRUD workflows for users, departments, semesters, courses, students, faculty, attendance, examinations, marks, assignments, library books and borrowing, fee records and payments, notices, and activity reporting.

## User preferences

No additional user preferences have been recorded.

## Gotchas

- Run API and frontend typechecks after changing generated API contracts.
- Schema changes are applied to the development database with the DB package push command; production schema changes are handled at publish time.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
