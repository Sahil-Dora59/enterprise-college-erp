# API test foundation

These tests use Node's built-in `node:test` runner through the workspace's
existing TypeScript loader. They do not connect to a database, use production
credentials, or call external providers.

Database-backed login, session invalidation, permission assignments, ownership
boundaries, and student CRUD persistence require an explicitly isolated
`TEST_DATABASE_URL` with the V2 schema. The repository does not currently
provide that isolated database configuration, so those flows are intentionally
not exercised against the normal development database in this foundation task.