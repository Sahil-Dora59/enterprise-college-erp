# Contributing

## Purpose

This guide defines the contribution workflow and quality expectations for the Version 2 repository.

## Before you start

Read [README.md](README.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), and [ENVIRONMENT.md](docs/ENVIRONMENT.md). Use pnpm; the repository rejects npm and yarn lockfile workflows.

## Development workflow

1. Create a focused branch or change set.
2. Preserve existing API contracts, database relationships, RBAC, and ownership rules.
3. Run `pnpm install` if dependencies changed.
4. Run `pnpm run typecheck`.
5. Run the frontend and backend builds.
6. Run the relevant runtime and permission smoke tests.
7. Update documentation when behavior, configuration, or operational commands change.

## Standards

- Use TypeScript and the existing workspace boundaries.
- Prefer shared validation, auth middleware, logging, and UI primitives.
- Do not commit secrets, generated credentials, local databases, or build output.
- Avoid broad refactors in feature fixes.
- New endpoints require authentication, authorization, validation, ownership analysis, and API documentation.

## Pull requests

Describe the problem, the scope of the change, security or ownership impact, verification commands, and any deployment considerations. Keep unrelated formatting changes out of the same change.

## Related Documentation

- [README](README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Installation](docs/INSTALLATION.md)
- [Security Policy](SECURITY.md)

**Version reference:** Enterprise College ERP `v2.0.0`
**Last updated:** 2026-08-04