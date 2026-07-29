---
name: Full-stack preview routing
description: Preview and workflow architecture for the ERP full-stack app.
---

The ERP's primary preview is a single Express process that serves the built React SPA and mounts the existing API under `/api`. The Canvas artifact is managed separately by Replit and cannot be deleted through ordinary workflow management; stop it and keep the ERP artifact selected as the Run target.

**Why:** A separate Vite preview and API process makes the Run action open the wrong surface and prevents one same-origin full-stack preview.

**How to apply:** Keep the ERP development service responsible for building the frontend before starting the API server, preserve `/api` routing before the SPA fallback, and use the validated artifact configuration rather than editing artifact TOML directly.