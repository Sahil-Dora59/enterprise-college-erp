# Environment variables and secrets

## Purpose

This document defines the runtime and build variables used by the Version 2 application.

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing and session security |
| `PORT` | Managed | Port supplied by the workflow/deployment |
| `CORS_ORIGIN` | Optional | Comma-separated origins for approved cross-origin clients |
| `DEMO_MODE` | Development only | Enables server-side demo user switching |
| `VITE_DEMO_MODE` | Development only | Enables demo controls in the client |

Never commit secrets or place credentials in source files. Configure secrets through the Replit Secrets interface.

Demo mode must remain disabled in production.

## Related Documentation

- [Installation](INSTALLATION.md)
- [Deployment](DEPLOYMENT.md)
- [Security Policy](../SECURITY.md)

**Version reference:** Enterprise College ERP `v2.0.0`
**Last updated:** 2026-08-04