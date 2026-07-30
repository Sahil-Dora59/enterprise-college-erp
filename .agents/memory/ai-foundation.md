---
name: AI Foundation boundary
description: The ERP AI module is additive, provider-neutral, and permissioned through the existing RBAC model.
---

The AI module must remain an additive vertical slice over the existing ERP: conversation history is owned by the authenticated user, access is granted through database-backed `ai.view`/`ai.manage` permissions, and provider integrations must stay behind a reusable service boundary.

**Why:** The ERP already has centralized authentication and RBAC; keeping AI behind those boundaries avoids inventing a parallel authorization model and prevents future provider credentials or SDK details from leaking into routes or UI.

**How to apply:** Add future model providers only inside the AI service boundary, keep settings as an administrative placeholder until a provider is intentionally connected, and preserve ownership checks on every conversation read, message mutation, and delete operation.