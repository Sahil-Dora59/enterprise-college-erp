---
name: ERP RBAC policy
description: Durable authorization rules for the college ERP's role and permission system.
---

The ERP uses database-backed roles, permissions, and role-permission assignments. Existing domain route paths remain stable; a centralized API middleware maps request modules and read/write methods to permission keys, while `/auth/login` and `/auth/me` return the current permission set for client navigation and route guards.

**Why:** Role labels alone were insufficient for complete authorization and would allow direct URL/API access to modules that were hidden in the sidebar.

**How to apply:** Add new modules by defining view/manage permission keys, seeding role assignments, extending the centralized request mapping, updating the OpenAPI user contract, and adding client route/sidebar checks.