# Deployment guide

## Purpose

This guide summarizes the deployment checks and production configuration required for the Version 2 full-stack service.

1. Confirm development typechecks and production builds pass.
2. Confirm `DATABASE_URL` and `SESSION_SECRET` are configured as deployment secrets.
3. Keep `DEMO_MODE` and `VITE_DEMO_MODE` disabled for production.
4. Apply database schema changes through the approved deployment migration flow.
5. Publish the existing `artifacts/college-erp: web` workflow; do not create a second API or frontend owner.
6. Verify:

```text
/api/healthz
/login
```

7. Test login, logout, RBAC-denied routes, student ownership, fee access, AI access, and the primary dashboards after publishing.

The API applies Helmet security headers, bounded JSON body sizes, authentication rate limits, request IDs, sanitized 500 responses, persisted session validation, and centralized permission checks.

## Related Documentation

- [Environment](ENVIRONMENT.md)
- [Installation](INSTALLATION.md)
- [Release Readiness](RELEASE_READINESS.md)
- [Security Policy](../SECURITY.md)

**Version reference:** Enterprise College ERP `v2.0.0`
**Last updated:** 2026-08-04