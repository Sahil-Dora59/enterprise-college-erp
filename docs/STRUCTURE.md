# Project structure

## Purpose

This document explains the main Version 2 workspace folders and their responsibilities.

```text
artifacts/college-erp/
  src/App.tsx                 SPA route registry
  src/components/             shared UI and shell
  src/pages/                  feature pages
artifacts/api-server/
  src/routes/                 REST route modules
  src/middlewares/            auth, RBAC, and error handling
  src/services/               provider-neutral services
lib/db/src/schema/            Drizzle PostgreSQL models
lib/api-spec/                 OpenAPI source contract
lib/api-zod/                  generated validation types
lib/api-client-react/         generated React Query hooks
docs/                         operations and deployment guides
```

The ERP is a same-origin full-stack application. The configured ERP workflow owns the preview port and starts the Express process that serves both API and built frontend.

## Related Documentation

- [Architecture](ARCHITECTURE.md)
- [Installation](INSTALLATION.md)
- [Contributing](../CONTRIBUTING.md)

**Version reference:** Enterprise College ERP `v2.0.0`
**Last updated:** 2026-08-04