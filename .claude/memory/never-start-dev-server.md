---
name: never-start-dev-server
description: Never start dev servers — the dev keeps them running
type: feedback
---

Never start any dev server for Dealflow (`bun run dev`, `vite`, `bun --watch`, API :3001, web :5173, wa-gateway :3002). The dev keeps the whole stack running himself.

**Why:** While browser-verifying a change, Claude spun up an extra `vite` (landed on :5174 since :5173 was taken); the dev already had everything up and asked to kill it and never start one again — a stray server wastes a port and muddies which instance is being tested.

**How to apply:** To verify in the browser, use the instance the operator already has in the air. If it's down, ask him to start it (or suggest he type `! bun run dev`) — don't launch it yourself. If you accidentally start a process, kill only your own (check PID/port so you don't touch his :5173/:3001/:3002) and don't restart. Enforced in `CLAUDE.md` ("Regras permanentes"). Pairs with [[verify-in-browser-before-commit]].
