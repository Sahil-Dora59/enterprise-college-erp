# Enterprise College ERP Version 2 — Architecture

## Purpose

This document describes the implemented Version 2 runtime boundaries, security boundary, and operational model.

The application is a pnpm workspace with a React/Vite SPA and a shared Express API server. The full-stack preview is owned by Express: the API is mounted under `/api`, then the built SPA is served with a history fallback.

## Runtime boundaries

- `artifacts/college-erp`: role-aware React UI, protected by the existing auth context and shell.
- `artifacts/api-server`: Express routes, JWT/session validation, RBAC, structured logging, rate limiting, and workers.
- `lib/db`: Drizzle PostgreSQL schema and shared database client.
- `lib/api-spec`: REST contract source of truth.

## Security boundary

Bearer JWTs are checked against active, non-expired database sessions on every protected request. RBAC authorization runs centrally before core routes. Domain routes enforce ownership for parent, recruiter, student, and other scoped resources. Secrets are supplied through environment/secrets management and are never returned by APIs.

## Operations

`/api/healthz` exposes service status, uptime, memory, and timestamp. Integration queues, jobs, audit entries, webhook records, API keys, payments, and backup records are provider-neutral and persisted in PostgreSQL.

## Related Documentation

- [Database](DATABASE.md)
- [API](API.md)
- [Environment](ENVIRONMENT.md)
- [Deployment](DEPLOYMENT.md)

**Version reference:** Enterprise College ERP `v2.0.0`
**Last updated:** 2026-08-04