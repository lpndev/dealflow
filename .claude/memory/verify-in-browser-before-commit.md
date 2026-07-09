---
name: verify-in-browser-before-commit
description: Every new feature must be verified in the browser before committing
type: feedback
---

For any new feature, verify it working in the real browser (drive the actual UI flow, observe behavior) BEFORE committing. Only commit after browser verification passes.

**Why:** tests + typecheck prove logic, not that the feature actually works end-to-end in the running app. The user wants eyes-on-glass confirmation.

**How to apply:** after implementing a feature and passing test/lint/typecheck, run the app (`bun run dev`), drive the affected flow in the browser (Chrome automation), confirm it behaves, then commit. If a flow can't be fully driven in-sandbox (e.g. needs WhatsApp pairing), verify as much as possible and state honestly what couldn't be exercised. Exception: pure type-only/config refactors with no runtime change (typecheck+lint+test+build cover those). Codified in `CLAUDE.md` (Convenções).
