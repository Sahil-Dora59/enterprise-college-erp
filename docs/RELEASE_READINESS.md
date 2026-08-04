# Release Readiness

## Verification

- Workspace typecheck
- Frontend production build
- Backend production build
- Database schema push
- Workflow restart
- Authentication, RBAC, ownership, parent, placement, admissions, AI, notification, export, search, and integration smoke tests

## Scores

The current release has no known blocking compile, startup, authentication, authorization, or ownership failures in the validated development environment. Final production scores must be recalculated against the deployment environment after external providers, production database migrations, browser matrix testing, and backup/restore drills are configured.

## Production checklist

1. Configure `DATABASE_URL`, `SESSION_SECRET`, and approved `CORS_ORIGIN`.
2. Apply the schema through the deployment migration process.
3. Configure external email, SMS, WhatsApp, payment, storage, and calendar providers.
4. Run backup and restore drills.
5. Run Chrome, Edge, Firefox, and Safari responsive acceptance checks.