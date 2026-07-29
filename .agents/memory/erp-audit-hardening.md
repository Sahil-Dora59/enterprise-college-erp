---
name: ERP audit hardening
description: Durable security lessons from the ERP enterprise audit.
---

Student-facing endpoints must enforce ownership at the query and mutation boundary for every domain that exposes student data, including attendance, marks, fees, loans, and assignment submissions. Hiding a route or filtering the UI is not sufficient.

**Why:** Direct API requests and stale frontend links bypass UI visibility; a misplaced ownership predicate can also turn into a runtime query failure if it references a table that is not part of the query.

**How to apply:** Reuse the authenticated user's current database-backed student identity, add predicates only against joined tables in the current query, and smoke-test every role against representative endpoints after authorization changes.