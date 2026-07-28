---
name: Artifact build environment
description: Required environment variables for manually building the college ERP frontend outside its managed workflow.
---

Manual Vite production builds for artifact web apps require both `PORT` and `BASE_PATH`; managed artifact workflows inject them automatically.

**Why:** The frontend typecheck can pass while a standalone build fails during config loading when either variable is absent.

**How to apply:** Use the managed workflow for normal verification. For a manual build, provide the configured service port and the artifact preview base path.