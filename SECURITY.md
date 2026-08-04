# Security Policy

## Supported version

The current supported release is Enterprise College ERP Version 2, stable release `v2.0.0`.

## Reporting a vulnerability

Do not disclose security vulnerabilities in public issues. Contact the project maintainers through the private repository security channel and include:

- A concise description and affected area
- Reproduction steps or a minimal proof of concept
- Impact and suggested mitigation, if known
- The first version in which the issue was observed

Remove personal data, credentials, tokens, and production records from reports.

## Security baseline

The application uses signed JWTs, database-backed active sessions, bcrypt password hashing, Helmet, bounded request bodies, rate limiting, centralized RBAC, ownership checks, upload validation, parameterized Drizzle queries, request IDs, sanitized errors, and sensitive-log redaction.

Production operators must configure secrets through the deployment secret manager, disable demo mode, apply schema changes through the approved migration process, rotate credentials, and validate backups and monitoring.