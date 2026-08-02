---
name: Demo mode production default
description: Demo role switching must be explicitly enabled in development and never be enabled by the default full-stack command.
---

Demo Mode is opt-in through explicit development environment variables; the standard full-stack workflow defaults both client and server demo flags to false.

**Why:** A production-like workflow must not expose role switching or provision demo users accidentally.

**How to apply:** Enable `VITE_DEMO_MODE=true DEMO_MODE=true` only for deliberate local/demo verification.