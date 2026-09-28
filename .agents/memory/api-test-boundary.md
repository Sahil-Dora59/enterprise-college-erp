---
name: API test boundary
description: Environment constraints and safety rules for extending the API regression suite
---

Use the API workspace's TypeScript test loader for source-level tests because the repository uses extensionless TypeScript imports and directory-based workspace packages that native Node TypeScript execution does not resolve reliably.

**Why:** Native Node TypeScript tests failed before reaching application code on the workspace's extensionless imports and database package exports. The loader matches the existing build/runtime module behavior.

**How to apply:** Keep unit and request-boundary tests database-free. Only add database-backed login, session, RBAC assignment, ownership, or CRUD tests when an explicitly isolated `TEST_DATABASE_URL` is configured; never point regression tests at the normal development or production database. When provisioning a local PostgreSQL cluster in this environment, set its Unix socket directory inside the temporary cluster directory because `/run/postgresql` may not exist.