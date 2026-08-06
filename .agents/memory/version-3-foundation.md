---
name: Version 3 foundation boundary
description: Version 3 infrastructure is additive and provider-neutral while Version 2 routes and database behavior remain the compatibility surface.
---

Version 3 foundation work must add contracts and adapters without replacing or rewriting stable Version 2 routes, APIs, authentication, RBAC, or database schema.

**Why:** Version 2 is production-ready and frozen; future enterprise modules need shared infrastructure without destabilizing the existing release.

**How to apply:** Prefer standalone config, error, repository, service, middleware, and UI foundation contracts. Integrate them into business modules only when a later Version 3 scope explicitly requires it.