---
name: API hardening
description: Baseline security and resilience conventions for the ERP Express server.
---

The API baseline includes Helmet headers, bounded JSON/form bodies, rate limits on login and password-change endpoints, request IDs with structured logs, sanitized JSON error handling, and fatal-process shutdown with server close.

**Why:** Authentication endpoints are abuse-sensitive, unexpected errors must not leak internals, and a process that survives an uncaught exception can serve unsafe or corrupted state.

**How to apply:** Keep cross-cutting middleware before `/api` routes, preserve the existing authorization order, avoid logging bearer tokens/cookies, and verify both the standalone API and consolidated full-stack workflows after dependency or middleware changes.