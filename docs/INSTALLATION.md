# Installation and local operation

## Purpose

This guide explains how to install, initialize, run, and verify the Version 2 workspace locally.

## Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL
- A configured `DATABASE_URL`

## Setup

```bash
pnpm install
pnpm --filter @workspace/db run push
```

The database push command is intended for development. Production schema changes should be applied through the deployment process.

## Run the full-stack ERP

```bash
pnpm --filter @workspace/college-erp run fullstack
```

The application builds the React frontend and starts the Express API, which serves the compiled SPA and `/api` routes from the same origin.

## Verify

```bash
curl http://localhost:$PORT/api/healthz
pnpm --filter @workspace/college-erp run typecheck
pnpm --filter @workspace/api-server run typecheck
```

## Related Documentation

- [Environment](ENVIRONMENT.md)
- [Database](DATABASE.md)
- [Deployment](DEPLOYMENT.md)
- [Contributing](../CONTRIBUTING.md)

**Version reference:** Enterprise College ERP `v2.0.0`
**Last updated:** 2026-08-04