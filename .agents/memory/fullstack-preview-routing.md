---
name: Full-stack preview routing
description: Preview and workflow architecture for the ERP full-stack app.
---

The ERP's primary preview is a single Express process that serves the built React SPA and mounts the existing API under `/api`. The Run button must select only the ERP web workflow; the legacy standalone API workflow must not also be started because the ERP full-stack child inherits the preview port.

**Why:** Starting the legacy API workflow alongside the ERP workflow caused the full-stack child to inherit `PORT=22584`, collide with the existing process, and exit with `EADDRINUSE`; Replit then surfaced 502 responses from the unavailable preview process.

**How to apply:** Keep the ERP development service responsible for building the frontend before starting the API server, preserve `/api` routing before the SPA fallback, keep `runButton = "artifacts/college-erp: web"`, remove duplicate legacy API workflow startup from `.replit` through validated replacement, and stop the standalone API workflow when cleaning up an old session.