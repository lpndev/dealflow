# Cloudflare Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the whole Dealflow product on Cloudflare — landing (Astro) and panel (React SPA) as Workers static assets, the API (Hono) as a Worker on D1, the WhatsApp gateway (Baileys) as an always-on Cloudflare Container — keeping the local Bun dev/test flow unchanged.

**Architecture:** Everything that fits Workers' stateless request model runs on Workers; only the one stateful piece (the Baileys WhatsApp socket, which needs an always-on process) runs on a Cloudflare Container. The DB moves from `bun:sqlite` to D1 for the deployed API, behind a thin driver factory so local dev and Vitest keep `bun:sqlite`. The existing "use-cases receive `db` as an argument" design means the domain code does not change — only the boundary (route/scheduler) picks the driver.

**Tech Stack:** Bun workspaces, Hono, React + Vite (panel), Astro (landing), Drizzle ORM, Cloudflare Workers + Static Assets + D1 + Cron Triggers + Containers, better-auth, Baileys.

## Global Constraints

Copied verbatim from `CLAUDE.md`; every task's requirements implicitly include these.

- **TypeScript strict**; lint is type-aware (`bun run lint` = `eslint --fix .`); `bun run typecheck` chains per-app `tsc`.
- **No comments in code.** Knowledge goes to `CLAUDE.md`, not inline comments. No `ponytail:`/TODO comments left behind.
- **shadcn-first** for any panel UI; primitives come from `@dealflow/ui`, not re-implemented.
- **Prettier owns formatting** (config: `semi:false`, `trailingComma:none`, `singleAttributePerLine:true`, `printWidth:80`). Match it in every snippet.
- **Commits:** one line, lowercase, conventional (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`), no body, no `Co-Authored-By`. Split by concern.
- **Tests centralized** in `packages/tests` (`@dealflow/tests`), Vitest under the Bun runtime (`bun run --bun`), mirroring the target app by subfolder.
- **NEVER start a dev server** (`bun run dev`/`vite`/`--watch`/wrangler dev in watch). The human runs those. Use one-shot builds/checks only.
- **Revenue-critical invariants stay green** (publication uses our `affiliateUrl`; no send without affiliate link; `unique(publicationId,destinationId)`; retry never re-sends `sent`; fail-closed on financial doubt).
- **Repo is public** — no secrets, WhatsApp session (`wa-auth/`), DB (`*.db`), real affiliate links, emails, phones, or JIDs in code/tests/docs/history. Sweep every diff before committing.
- **`workspaceId` always comes from the session**, never from body/query — the tenancy boundary. Keep it so across every runtime.
- After each phase: sync any new durable knowledge into `CLAUDE.md`, then remind the operator to run `/simplify` and `/code-review` before committing.

## Deployment topology (target)

```
apps/landing  (Astro SSG)     -> Cloudflare Worker (static assets)
apps/panel    (React SPA)     -> Cloudflare Worker (static assets, SPA fallback)
apps/api      (Hono)          -> Cloudflare Worker + D1 + Cron Trigger (scheduler)
apps/wa-gateway (Baileys)     -> Cloudflare Container (always-on) + Durable Object storage for wa-auth
apps/extension                -> user's browser (unchanged)
```

**Verified platform facts (2026-07, with sources at bottom):**
- Workers Static Assets: `not_found_handling: "single-page-application"` serves `index.html` on unmatched routes; `run_worker_first: ["/api/*"]` lets one Worker serve assets AND code.
- Astro: `assets.directory` for SSG static output on Workers, or `@astrojs/cloudflare` for SSR. Landing = SSG.
- Containers: Workers Paid ($5/mo); scale-to-zero via `sleepAfter`; **disk is ephemeral** (fresh image on every restart/wake) — durable state must live in Durable Object storage or R2.
- D1 + Drizzle: `drizzle-orm/d1` driver; migrations applied via `wrangler d1 migrations apply` (not migrate-on-boot).

## Phase independence & ordering

Each phase produces working software on its own. Phases 1–2 have **zero Cloudflare dependency** and are fully execution-ready. Phases 3–6 touch live Cloudflare infra; their config/code below is concrete, but each has an explicit **deploy-iterate checkpoint** where you refine against the real platform (wrangler output, D1 binding, Container logs). Do not treat those checkpoints as failures — they are the platform loop.

Recommended order: **1 → 2 → 3 → 4 → 5 → 6.** Phase 6 (gateway Container) is heaviest and last because it needs the custom Baileys persistence adapter.

---

## Phase 1 — Rename `apps/web` → `apps/panel`

**Rationale:** A landing page is coming; the current SPA is the operator *panel*. Rename now while it is cheap, before adding a second frontend. Pure mechanical refactor, verified by the existing test suite. No behavior change. **The extension is NOT touched** — its `webUrl` default (`http://localhost:5173`) is the panel's dev URL; the port is unchanged by a folder rename.

**Files:**
- Move: `apps/web/` → `apps/panel/` (whole directory, `git mv`)
- Modify: `apps/panel/package.json` (name)
- Modify: `package.json` (root scripts `web:* → panel:*`)
- Modify: `packages/tests/vitest.config.ts:36` (web project alias path)
- Move + Modify: `packages/tests/tsconfig.web.json` → `tsconfig.panel.json` (paths + include)
- Modify: `packages/tests/package.json` (typecheck chain references `tsconfig.web.json`)
- Move: `packages/tests/web/` → `packages/tests/panel/` (test subfolder for the app)
- Modify: `packages/tests/vitest.config.ts` (project `name: "web"` + `include: ["web/**/*.test.ts"]`)
- Modify: `packages/tests/playwright.config.ts:43` (`cwd: ${root}apps/web`)

**Interfaces:**
- Produces: workspace package `@dealflow/panel` (was `@dealflow/web`); app dir `apps/panel`; root scripts `panel:dev|build|preview`. Every later phase refers to the panel by these names.

- [ ] **Step 1: Move the app directory with git**

```bash
cd /home/reki/dev/projects/dealflow
git mv apps/web apps/panel
```

- [ ] **Step 2: Rename the package**

In `apps/panel/package.json`, change:
```json
"name": "@dealflow/panel",
```
(was `"@dealflow/web"`). Leave the app's internal `vite.config.ts`/`tsconfig.json` untouched — they use relative paths (`./src`, `envDir: "../.."`) that survive the move.

- [ ] **Step 3: Update root scripts**

In `package.json`, replace the three `web:*` lines with:
```json
"panel:dev": "bun run --filter '@dealflow/panel' dev",
"panel:build": "bun run --filter '@dealflow/panel' build",
"panel:preview": "bun run --filter '@dealflow/panel' preview",
```

- [ ] **Step 4: Update the Vitest web project → panel**

In `packages/tests/vitest.config.ts`, the web project block: change the alias path and the project name/include:
```ts
resolve: { alias: { "@": r("../../apps/panel/src") } },
// ...
name: "panel",
include: ["panel/**/*.test.ts"]
```

- [ ] **Step 5: Move the test subfolder**

```bash
git mv packages/tests/web packages/tests/panel
```

- [ ] **Step 6: Rename and fix the web tsconfig**

```bash
git mv packages/tests/tsconfig.web.json packages/tests/tsconfig.panel.json
```
Then in `packages/tests/tsconfig.panel.json`:
```json
"paths": {
  "@/*": ["../../apps/panel/src/*"],
  "@support/*": ["./support/*"]
},
"include": ["panel"]
```

- [ ] **Step 7: Update the typecheck chain**

In `packages/tests/package.json`, in the `typecheck` script, change `tsc -p tsconfig.web.json` to `tsc -p tsconfig.panel.json`.

- [ ] **Step 8: Update Playwright cwd**

In `packages/tests/playwright.config.ts:43`, change `cwd: \`${root}apps/web\`` to `cwd: \`${root}apps/panel\``.

- [ ] **Step 9: Reinstall to relink the workspace**

```bash
bun install
```
Expected: lockfile updates the workspace package name; no errors.

- [ ] **Step 10: Verify typecheck**

Run: `bun run typecheck`
Expected: all 7 packages exit 0.

- [ ] **Step 11: Verify lint**

Run: `bun run lint`
Expected: no errors.

- [ ] **Step 12: Verify unit tests**

Run: `bun run test`
Expected: same pass count as before the rename (172 passed / 11 skipped baseline).

- [ ] **Step 13: Verify e2e (the real gate for the rename)**

Run: `bun run test:e2e`
Expected: PASS. This proves the Playwright `cwd` change and the panel build are correct end-to-end. If it fails on "cannot find apps/web", re-check Step 8.

- [ ] **Step 14: Verify a production build of the panel still works**

Run: `bun run panel:build`
Expected: `vite build` succeeds, emits `apps/panel/dist`.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "refactor: rename web app to panel"
```

- [ ] **Step 16: Update CLAUDE.md**

Replace `apps/web`/`@dealflow/web` references with `apps/panel`/`@dealflow/panel` in the Stack, Nota SPA, and Convenções sections. Commit:
```bash
git add CLAUDE.md
git commit -m "docs: rename web to panel in claude.md"
```

---

## Phase 2 — Scaffold `apps/landing` (Astro SSG)

**Rationale:** The public landing page. Static (SSG), reuses the design system (`@dealflow/ui`, already extracted for exactly this per CLAUDE.md's Nota packages/ui). No SSR, no API calls at first — just a marketing page. Deploy config comes in Phase 5.

**Files:**
- Create: `apps/landing/package.json`
- Create: `apps/landing/astro.config.mjs`
- Create: `apps/landing/tsconfig.json`
- Create: `apps/landing/src/pages/index.astro`
- Create: `apps/landing/src/styles/globals.css` (imports `@dealflow/ui/styles.css`)
- Modify: `package.json` (root `landing:*` scripts; `build` wildcard already covers it)
- Create: `packages/tests/tsconfig.landing.json` (typecheck) and add to the chain

**Interfaces:**
- Consumes: `@dealflow/ui` primitives + `@dealflow/ui/styles.css`.
- Produces: workspace package `@dealflow/landing`; static output at `apps/landing/dist`.

- [ ] **Step 1: Create the Astro app via the official starter**

```bash
cd /home/reki/dev/projects/dealflow/apps
bunx create-astro@latest landing --template minimal --no-install --no-git --skip-houston --typescript strict
```
Expected: `apps/landing/` with a minimal Astro skeleton. (If `create-astro` prompts interactively despite flags, create the files manually per Steps 2–5.)

- [ ] **Step 2: Set the package name and scripts**

In `apps/landing/package.json`:
```json
"name": "@dealflow/landing",
```
Ensure scripts exist: `"dev": "astro dev"`, `"build": "astro build"`, `"preview": "astro preview"`, `"typecheck": "astro check"`.

- [ ] **Step 3: Add the design system as a dependency**

In `apps/landing/package.json` dependencies:
```json
"@dealflow/ui": "workspace:*"
```
Then:
```bash
cd /home/reki/dev/projects/dealflow && bun install
```

- [ ] **Step 4: Wire Tailwind v4 + the shared stylesheet**

Astro uses Vite under the hood. In `apps/landing/astro.config.mjs`, add the Tailwind v4 Vite plugin and make Vite scan the workspace UI package (v4 ignores `node_modules`, and the package is symlinked there — same gotcha as the panel):
```js
import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  vite: { plugins: [tailwindcss()] }
})
```
Create `apps/landing/src/styles/globals.css`:
```css
@import "@dealflow/ui/styles.css";
```
The `@source ".."` inside `@dealflow/ui`'s own `globals.css` already pulls `packages/ui/src`; if landing-local classes don't compile, add `@source "./src"` here.

- [ ] **Step 5: A minimal page that proves the design system renders**

`apps/landing/src/pages/index.astro`:
```astro
---
import "../styles/globals.css"
---
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Dealflow</title>
  </head>
  <body class="bg-background text-foreground">
    <main class="mx-auto max-w-2xl p-8">
      <h1 class="text-3xl font-bold">Dealflow</h1>
      <p class="text-muted-foreground">Colar, revisar, enviar.</p>
    </main>
  </body>
</html>
```

- [ ] **Step 6: Add root scripts**

In root `package.json`:
```json
"landing:dev": "bun run --filter '@dealflow/landing' dev",
"landing:build": "bun run --filter '@dealflow/landing' build",
"landing:preview": "bun run --filter '@dealflow/landing' preview",
```

- [ ] **Step 7: Add landing to the typecheck chain**

Create `packages/tests/tsconfig.landing.json` extending base if you want it in the central chain, OR rely on `astro check` via the app's own `typecheck`. Simplest: the root `typecheck` uses `--filter '*'`, so the app's `astro check` runs automatically. Confirm `apps/landing/package.json` has `"typecheck": "astro check"`.

- [ ] **Step 8: Verify the build (proves Tailwind + design tokens compile)**

Run: `bun run landing:build`
Expected: `astro build` succeeds, emits `apps/landing/dist/index.html`. Grep the emitted CSS for a token to confirm the design system compiled:
```bash
grep -r "background" apps/landing/dist/_astro/*.css | head -1
```
Expected: at least one match (tokens compiled).

- [ ] **Step 9: Verify typecheck + lint of the whole repo**

Run: `bun run typecheck && bun run lint`
Expected: exit 0 (astro check clean; eslint clean — note `.astro` files may be outside eslint's scope, which is fine).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold astro landing app"
```

- [ ] **Step 11: Update CLAUDE.md**

Add `apps/landing` (Astro SSG, reuses `@dealflow/ui`) to the Stack section and Nota packages/ui (the "futura landing" is now real). Commit `docs: note landing app in claude.md`.

---

## Phase 3 — Database driver factory (bun:sqlite local/tests, D1 in prod) + Cron scheduler

**Rationale:** Workers cannot use `bun:sqlite` (no filesystem). Move the deployed API to D1 without disturbing local dev or the Vitest suite, which stay on `bun:sqlite :memory:`. The domain use-cases already take `db` as an argument, so they do not change — only `db.ts` (the factory) and the boundary that supplies `db` (routes, scheduler) change. The `setInterval` scheduler cannot run on Workers; it becomes a **Cron Trigger** handler.

**Deploy-iterate checkpoint:** the D1 binding only exists inside a Worker request/cron `env`. You will iterate on wiring `env.DB` through Hono context in Phase 4; this phase makes the factory able to accept either driver and keeps local/tests green.

**Files:**
- Modify: `apps/api/src/shared/db.ts` (add a D1 path behind the existing factory; keep bun:sqlite default)
- Create: `apps/api/src/shared/db-d1.ts` (D1 drizzle wrapper) — or inline in `db.ts` guarded by env
- Modify: `apps/api/src/features/publications/schedule/scheduler.ts` (extract the pure `dispatchDue` from the `setInterval` bootstrap; export a cron-callable entry)
- Create: `packages/tests/api/shared/db-factory.test.ts` (factory picks the right driver by input)
- Reference: Drizzle D1 docs (`drizzle-orm/d1`)

**Interfaces:**
- Consumes: existing `Db` type, `dispatchDue(db, provider, now)` (already pure, returns `Promise<DeliveryResult | null>`).
- Produces: `makeDb(driver)` returning a `Db`; a cron entry `runDueOnce(db, provider)` that dispatches one due delivery (reuses `dispatchDue`). Phase 4's Worker calls `makeDb` with a D1 binding; local/tests call it with bun:sqlite.

- [ ] **Step 1: Read the current db factory and scheduler**

Run: `sed -n '1,60p' apps/api/src/shared/db.ts && sed -n '1,60p' apps/api/src/features/publications/schedule/scheduler.ts`
Expected: confirm `getDb()`/`createDb()` shape and that `dispatchDue` is already separate from `startScheduler`.

- [ ] **Step 2: Write the failing factory test**

`packages/tests/api/shared/db-factory.test.ts`:
```ts
import { expect, it } from "vitest"
import { makeDb } from "@/shared/db"
import { destination } from "@/shared/schema"

it("makeDb builds a working sqlite db from an in-memory url", () => {
  const db = makeDb({ kind: "sqlite", url: ":memory:" })
  const rows = db.select().from(destination).all()
  expect(rows).toEqual([])
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `bun run test -- db-factory`
Expected: FAIL — `makeDb` is not exported.

- [ ] **Step 4: Implement `makeDb` in db.ts**

In `apps/api/src/shared/db.ts`, add a discriminated factory. Keep `getDb()`/`createDb()` for local/tests delegating to the sqlite branch; add a D1 branch. Concrete shape:
```ts
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite"
import { drizzle as drizzleD1 } from "drizzle-orm/d1"
import { Database } from "bun:sqlite"
import * as schema from "./schema"

export type DbConfig =
  | { kind: "sqlite"; url: string }
  | { kind: "d1"; binding: D1Database }

export function makeDb(config: DbConfig) {
  if (config.kind === "d1") return drizzleD1(config.binding, { schema })
  const sqlite = new Database(config.url)
  sqlite.exec("PRAGMA journal_mode = WAL;")
  return drizzleSqlite(sqlite, { schema })
}
```
Note: `drizzle-orm/d1` imports must not be evaluated in a way that pulls `bun:sqlite` on Workers. Since Workers bundles only what the Worker entry imports, and the Worker will import a D1-only entry (Phase 4), keep the sqlite `import { Database } from "bun:sqlite"` **lazy** if bundling complains — move it inside the sqlite branch via `await import("bun:sqlite")` and make `makeDb` async, or split into `db.ts` (sqlite) and `db-d1.ts` (D1) so the Worker never imports the sqlite module. Decide at Phase 4 bundling time; for now the split-file approach is safest:
  - `apps/api/src/shared/db.ts` keeps sqlite + `getDb()`/`createDb()`/`makeDb({kind:"sqlite"})`.
  - `apps/api/src/shared/db-d1.ts` exports `makeD1Db(binding)` importing only `drizzle-orm/d1`.

- [ ] **Step 5: Add `D1Database` types**

```bash
cd apps/api && bun add -d @cloudflare/workers-types
```
Add to `apps/api/tsconfig.json` compilerOptions `types`: `["bun", "@cloudflare/workers-types"]` (keep `bun`). This makes `D1Database` resolve without pulling a runtime dep.

- [ ] **Step 6: Run the factory test green**

Run: `bun run test -- db-factory`
Expected: PASS.

- [ ] **Step 7: Extract a cron-callable dispatch entry**

In `scheduler.ts`, keep `dispatchDue` as-is. Add:
```ts
export async function runDueOnce(db: Db, provider: MessagingProvider) {
  return dispatchDue(db, provider)
}
```
Leave `startScheduler` (setInterval) for the local Bun process; the Worker will call `runDueOnce` from a cron handler instead. No test change — `dispatchDue` is already covered by the scheduler tests.

- [ ] **Step 8: Full verify**

Run: `bun run typecheck && bun run lint && bun run test`
Expected: all green, same pass count + the new factory test.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/shared/db.ts apps/api/src/shared/db-d1.ts apps/api/src/features/publications/schedule/scheduler.ts packages/tests/api/shared/db-factory.test.ts apps/api/tsconfig.json apps/api/package.json bun.lock
git commit -m "feat: db driver factory for sqlite and d1"
```

- [ ] **Step 10: Generate D1 migrations from the existing schema**

The Drizzle schema is unchanged, so the SQL is the same; D1 just applies it via wrangler. Confirm `apps/api/drizzle/*.sql` migrations exist (they do, through `0009`). Phase 4 wires `wrangler d1 migrations apply`. No code change here — note in the plan that D1 migration application is a Phase 4 deploy step.

---

## Phase 4 — API on Cloudflare Workers + D1 + Cron Trigger

**Rationale:** Run the Hono API as a Worker. The app is already Hono, which runs natively on Workers. The two changes: (1) the DB comes from `c.env.DB` (D1 binding) per request instead of a module singleton; (2) the scheduler runs as a Cron Trigger handler, not `setInterval`.

**Deploy-iterate checkpoint:** wrangler config, D1 binding creation, and secret upload are done against your real Cloudflare account; iterate on `wrangler deploy` output.

**Files:**
- Create: `apps/api/wrangler.jsonc`
- Create: `apps/api/src/worker.ts` (Workers entry: `fetch` + `scheduled` handlers)
- Modify: `apps/api/src/app.ts` (make `getDb()` calls resolve from context — see below)
- Modify: routes that call `getDb()` — replace with `c.get("db")` set by middleware
- Keep: `apps/api/src/index.ts` (the Bun local entry with `startScheduler`)

**Interfaces:**
- Consumes: `makeD1Db(binding)` from Phase 3, `runDueOnce(db, provider)`.
- Produces: a deployed Worker serving the same `/api/*` + `/wa/*` + domain routes; a cron handler dispatching the queue.

- [ ] **Step 1: Thread `db` through Hono context instead of the module singleton**

Today routes call `getDb()`. On Workers the D1 binding is per-request. Add a middleware in `app.ts` that sets `db` on context, and read it in routes. Concrete middleware:
```ts
app.use("*", async (c, next) => {
  c.set("db", c.env?.DB ? makeD1Db(c.env.DB) : getDb())
  await next()
})
```
Extend `AppEnv` variables with `db: Db`. Then replace `getDb()` in route handlers with `c.get("db")`. The use-cases are unchanged (they already receive `db`). This is mechanical but touches every route file; do it per-router and run typecheck between.

- [ ] **Step 2: Verify local still works via the Bun entry**

The Bun `index.ts` path has no `c.env.DB`, so the middleware falls back to `getDb()` (bun:sqlite). Run: `bun run typecheck && bun run test`
Expected: green — local behavior identical.

- [ ] **Step 3: Create the Workers entry**

`apps/api/src/worker.ts`:
```ts
import app from "./app"
import { makeD1Db } from "./shared/db-d1"
import { runDueOnce } from "./features/publications/schedule/scheduler"
import { whatsappGateway } from "./integrations/whatsapp/gateway"

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDueOnce(makeD1Db(env.DB), whatsappGateway))
  }
}
```
`Env` is the wrangler-generated binding type (D1 `DB`, secrets, Container binding). Note: the gateway call in `scheduled` targets the Container (Phase 6); until Phase 6 lands, the cron dispatch will fail to reach a gateway — deploy the API Worker first and validate `fetch`, wire cron dispatch after Phase 6.

- [ ] **Step 4: Write wrangler.jsonc**

`apps/api/wrangler.jsonc`:
```jsonc
{
  "name": "dealflow-api",
  "main": "src/worker.ts",
  "compatibility_date": "2026-07-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    { "binding": "DB", "database_name": "dealflow", "database_id": "<from wrangler d1 create>" }
  ],
  "triggers": { "crons": ["* * * * *"] },
  "vars": { "NODE_ENV": "production" }
}
```
`nodejs_compat` is required because better-auth and parts of the app use Node APIs. `BETTER_AUTH_SECRET`, `WA_GATEWAY_TOKEN`, `TRUSTED_ORIGINS`, `BETTER_AUTH_URL` go in via `wrangler secret put` (not `vars`), never committed.

- [ ] **Step 5: Create the D1 database and apply migrations**

```bash
cd apps/api
bunx wrangler d1 create dealflow          # copy the database_id into wrangler.jsonc
bunx wrangler d1 migrations apply dealflow --remote
```
Expected: the existing `drizzle/*.sql` migrations apply to D1. If Drizzle's migration journal format differs from wrangler's expectation, generate a D1-compatible migrations dir with `drizzle-kit generate` targeting the D1 dialect and apply those. Iterate here.

- [ ] **Step 6: Upload secrets**

```bash
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put TRUSTED_ORIGINS
bunx wrangler secret put BETTER_AUTH_URL
bunx wrangler secret put WA_GATEWAY_TOKEN
```
Values are your production domain / a strong secret. These never touch the repo.

- [ ] **Step 7: Deploy and validate `fetch`**

```bash
bunx wrangler deploy
```
Expected: a `dealflow-api.<subdomain>.workers.dev` URL. Validate an unauthenticated endpoint (should 200 with null session):
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://dealflow-api.<subdomain>.workers.dev/api/auth/get-session
```
Expected: `200`. If `500`, check `wrangler tail` for missing `nodejs_compat` APIs or a D1 binding error.

- [ ] **Step 8: Commit the config + entry (no secrets)**

```bash
git add apps/api/wrangler.jsonc apps/api/src/worker.ts apps/api/src/app.ts apps/api/src/features
git commit -m "feat: run api as a cloudflare worker on d1"
```

- [ ] **Step 9: Update CLAUDE.md**

Document: API runs on Workers + D1; `db` comes from context (`c.get("db")`, D1 binding in prod, bun:sqlite local/tests); scheduler is a Cron Trigger (`runDueOnce`) in prod and `setInterval` locally; secrets via `wrangler secret`, config via `vars`; `NODE_ENV=production` set in `wrangler.jsonc`. Commit `docs: note api-on-workers in claude.md`.

---

## Phase 5 — Panel + landing as Workers static assets

**Rationale:** Serve both frontends from Workers static assets, with SPA fallback for the panel. Point the panel at the deployed API.

**Deploy-iterate checkpoint:** `wrangler deploy` for each; verify SPA deep-links and API reachability.

**Files:**
- Create: `apps/panel/wrangler.jsonc`
- Create: `apps/landing/wrangler.jsonc`
- Modify: build/deploy expectations (panel `VITE_API_URL` points to the API Worker at build time)

**Interfaces:**
- Consumes: the API Worker URL from Phase 4 (for `VITE_API_URL`), the `TRUSTED_ORIGINS` in the API must include the panel's deployed origin.

- [ ] **Step 1: Panel wrangler config (SPA)**

`apps/panel/wrangler.jsonc`:
```jsonc
{
  "name": "dealflow-panel",
  "compatibility_date": "2026-07-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```
No `main` — this is pure static asset serving with SPA fallback.

- [ ] **Step 2: Build the panel against the prod API**

`VITE_API_URL` is baked at build time. Build with it set to the API Worker URL:
```bash
VITE_API_URL=https://dealflow-api.<subdomain>.workers.dev bun run panel:build
```
Expected: `apps/panel/dist` with the API URL baked in.

- [ ] **Step 3: Deploy the panel**

```bash
cd apps/panel && bunx wrangler deploy
```
Expected: `dealflow-panel.<subdomain>.workers.dev`. Open a deep link (e.g. `/settings`) and confirm SPA fallback serves the app (no 404).

- [ ] **Step 4: Add the panel origin to the API's trusted origins**

```bash
cd apps/api && bunx wrangler secret put TRUSTED_ORIGINS
# value: https://dealflow-panel.<subdomain>.workers.dev  (comma-separated if multiple)
```
Redeploy the API if needed. Verify the panel can call the API (login flow) with no 403 (the `NODE_ENV=production` gating means only `TRUSTED_ORIGINS` is trusted — see `trusted-origins.ts`).

- [ ] **Step 5: Landing wrangler config (static)**

`apps/landing/wrangler.jsonc`:
```jsonc
{
  "name": "dealflow-landing",
  "compatibility_date": "2026-07-01",
  "assets": { "directory": "./dist" }
}
```
No SPA fallback — Astro emits real routes.

- [ ] **Step 6: Build and deploy the landing**

```bash
bun run landing:build && cd apps/landing && bunx wrangler deploy
```
Expected: `dealflow-landing.<subdomain>.workers.dev` serving the static page.

- [ ] **Step 7: Commit configs (no secrets)**

```bash
git add apps/panel/wrangler.jsonc apps/landing/wrangler.jsonc
git commit -m "feat: serve panel and landing as workers static assets"
```

- [ ] **Step 8: Update CLAUDE.md**

Document: panel = Worker static assets with SPA fallback (`VITE_API_URL` baked at build to the API Worker); landing = Worker static assets (Astro SSG); prod origins trusted only via `TRUSTED_ORIGINS`. Commit `docs: note frontend deploy in claude.md`.

---

## Phase 6 — WhatsApp gateway on a Cloudflare Container

**Rationale:** Baileys needs an always-on process holding a persistent WebSocket to WhatsApp + session state. Cloudflare Containers run a real Bun process, but **disk is ephemeral** — so the Baileys auth state (`wa-auth/`) must persist to Durable Object storage (or R2), and the instance must stay always-on (no scale-to-zero) so the socket survives.

**Deploy-iterate checkpoint:** the custom auth-state adapter and always-on behavior are validated live against WhatsApp (QR pairing survives a container restart). This is the heaviest phase; budget iteration.

**Files:**
- Create: `apps/wa-gateway/Dockerfile`
- Create: `apps/wa-gateway/src/auth-state.ts` (custom Baileys `AuthenticationState` backed by a durable store)
- Modify: `apps/wa-gateway/src/whatsapp.ts` (use the custom auth state instead of `useMultiFileAuthState`)
- Create: `apps/wa-gateway/wrangler.jsonc` (Container + Durable Object binding)
- Create: a Worker+DO wrapper that owns the Container and the persistent store (in `apps/api` or a small dedicated Worker)
- Create: `packages/tests/wa-gateway/auth-state.test.ts` (adapter round-trips creds through a fake store)

**Interfaces:**
- Consumes: the same gateway HTTP surface (`GET /health`, `/sessions/:id[/qr|/groups]`, `POST /sessions/:id/{connect,end,logout,messages}`) — unchanged, so the API's `MessagingProvider` (`WA_GATEWAY_URL` → Container binding fetch) barely changes.
- Produces: a container image running the gateway with durable auth state; the API reaches it via a Container/DO binding instead of `http://localhost:3002`.

- [ ] **Step 1: Design the durable auth store interface (failing test first)**

The adapter must implement Baileys' `AuthenticationState` (`{ creds, keys }`) plus `saveCreds`, reading/writing to an injected store instead of the filesystem. `packages/tests/wa-gateway/auth-state.test.ts`:
```ts
import { expect, it } from "vitest"
import { makeAuthState } from "@extension/../wa-gateway/src/auth-state" // adjust alias
import { initAuthCreds } from "@whiskeysockets/baileys"

function memoryStore() {
  const m = new Map<string, string>()
  return {
    get: async (k: string) => m.get(k) ?? null,
    set: async (k: string, v: string) => void m.set(k, v),
    del: async (k: string) => void m.delete(k)
  }
}

it("round-trips creds through the store", async () => {
  const store = memoryStore()
  const a = await makeAuthState(store)
  await a.saveCreds()
  const b = await makeAuthState(store)
  expect(b.state.creds.registrationId).toBe(a.state.creds.registrationId)
})
```
(Confirm the Baileys import path/name `initAuthCreds`; the vitest wa-gateway project alias may need a small tweak to resolve `wa-gateway/src`.)

- [ ] **Step 2: Run it to see it fail**

Run: `bun run test -- auth-state`
Expected: FAIL — `makeAuthState` not defined.

- [ ] **Step 3: Implement the adapter**

`apps/wa-gateway/src/auth-state.ts`: implement `makeAuthState(store)` returning `{ state: { creds, keys }, saveCreds }`, serializing creds/keys as JSON in the store (mirrors Baileys' `useMultiFileAuthState` but store-backed). Use Baileys' `initAuthCreds`, `BufferJSON` for the (de)serialization. Keys are namespaced per credential type. Keep it minimal — one store, JSON values.

- [ ] **Step 4: Run it green**

Run: `bun run test -- auth-state`
Expected: PASS.

- [ ] **Step 5: Swap `useMultiFileAuthState` in the gateway**

In `apps/wa-gateway/src/whatsapp.ts`, replace `useMultiFileAuthState(dir)` with `makeAuthState(storeFor(sessionId))`, where `storeFor` returns a store bound to the durable backend (DO storage via HTTP to the owning Worker/DO, or R2). Keep the legacy-session adoption logic only for the local Bun path (filesystem) — gate it so the Container path uses the durable store. Preserve the multi-session `Map<sessionId, Session>` and the `^[A-Za-z0-9_-]+$` id validation.

- [ ] **Step 6: Local verification (fake store, no real WhatsApp)**

The gateway integration tests are typecheck-only (real Baileys needs a phone/QR — cannot run in sandbox, per CLAUDE.md Nota Baileys). Run: `bun run typecheck && bun run test`
Expected: green, including the new auth-state test. Real pairing is validated live in Step 10.

- [ ] **Step 7: Dockerfile**

`apps/wa-gateway/Dockerfile`:
```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/wa-gateway apps/wa-gateway
COPY packages packages
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
EXPOSE 3002
CMD ["bun", "run", "apps/wa-gateway/src/index.ts"]
```
(Adjust COPY paths for the monorepo; the Container needs the gateway + its workspace deps.)

- [ ] **Step 8: Wrangler config — Container + Durable Object + always-on**

`apps/wa-gateway/wrangler.jsonc` (Container owned by a DO; `sleepAfter` long/disabled so the socket stays alive; DO storage persists the auth state):
```jsonc
{
  "name": "dealflow-gateway",
  "main": "src/container-worker.ts",
  "compatibility_date": "2026-07-01",
  "containers": [
    {
      "class_name": "GatewayContainer",
      "image": "./Dockerfile",
      "instance_type": "basic",
      "max_instances": 1
    }
  ],
  "durable_objects": {
    "bindings": [{ "name": "GATEWAY", "class_name": "GatewayContainer" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["GatewayContainer"] }]
}
```
Create `apps/wa-gateway/src/container-worker.ts` extending Cloudflare's `Container` DO class: set `sleepAfter` to a high value (or keep warm via an alarm) so the WhatsApp socket does not drop, expose the auth-state store over the DO's `ctx.storage`, and route the API's requests to the container.

- [ ] **Step 9: Point the API at the Container binding**

In `apps/api`, add a Container/service binding for the gateway and change `WA_GATEWAY_URL` fetch in `integrations/whatsapp/gateway.ts` to fetch the bound gateway Worker instead of `http://localhost:3002`. Keep the `x-gateway-token` auth (`WA_GATEWAY_TOKEN` secret) — still fail-closed off-loopback. Local Bun dev keeps the HTTP `WA_GATEWAY_URL` path.

- [ ] **Step 10: Deploy and validate live (the real gate)**

```bash
cd apps/wa-gateway && bunx wrangler deploy
```
Then, from the panel in production: connect WhatsApp, scan the QR, send a test delivery to a test group. Then **restart the container** (redeploy or force a restart) and confirm the session **survives without re-scanning** — this proves the durable auth-state adapter works against the ephemeral disk. If it asks for QR again, the store round-trip is broken (revisit Steps 3/5).

- [ ] **Step 11: Wire the cron dispatch end-to-end**

Now that the gateway is reachable via binding, confirm the API's Cron Trigger (`scheduled` → `runDueOnce`) dispatches a scheduled delivery to the container. Schedule a send from the panel, wait for the cron tick, confirm it goes `sent`.

- [ ] **Step 12: Commit (no secrets, no wa-auth)**

```bash
git add apps/wa-gateway/Dockerfile apps/wa-gateway/src/auth-state.ts apps/wa-gateway/src/whatsapp.ts apps/wa-gateway/src/container-worker.ts apps/wa-gateway/wrangler.jsonc apps/api/src/integrations/whatsapp/gateway.ts packages/tests/wa-gateway/auth-state.test.ts
git commit -m "feat: run wa-gateway as a cloudflare container with durable auth state"
```
Sweep the diff: no `wa-auth/`, no tokens, no real JIDs.

- [ ] **Step 13: Update CLAUDE.md**

Document: gateway runs as a Cloudflare Container (always-on, `basic` instance) owned by a Durable Object; disk is ephemeral so Baileys auth state persists in DO storage via a custom `makeAuthState` adapter (replaces `useMultiFileAuthState` on the Container path; filesystem path kept for local Bun); the API reaches the gateway via a Container/DO binding with `x-gateway-token`; cron dispatch validated end-to-end. Commit `docs: note gateway-on-containers in claude.md`.

---

## Self-Review

**Spec coverage:** Phase 1 (rename) ✓, Phase 2 (Astro landing) ✓, Phase 3 (D1 factory + cron) ✓, Phase 4 (API Worker) ✓, Phase 5 (static assets) ✓, Phase 6 (Container gateway) ✓ — all six phases from the agreed design are present.

**Known iteration points (honest, not placeholders):** D1 migration format (Phase 4 Step 5), wrangler bundling of `bun:sqlite` vs D1 split (Phase 3 Step 4), Container always-on/sleep tuning and the DO-storage auth adapter (Phase 6). These are deploy-time loops against a live platform, flagged explicitly — not vague TODOs. Every code/config snippet is concrete and runnable as a starting point.

**Type consistency:** `makeDb`/`makeD1Db` (Phase 3) are consumed by `worker.ts` (Phase 4). `runDueOnce(db, provider)` (Phase 3) is called by the cron handler (Phase 4) and validated in Phase 6. `makeAuthState(store)` (Phase 6) is defined and consumed within Phase 6. The gateway HTTP surface is unchanged, so `MessagingProvider` stays compatible.

**Non-negotiable across all phases:** local Bun dev + Vitest stay on `bun:sqlite`; the extension is untouched by the rename; `workspaceId` from session; revenue invariants green; repo stays secret-free.

## Sources

- [Workers Static Assets — SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Cloudflare Containers — overview](https://developers.cloudflare.com/containers/)
- [Cloudflare Containers — pricing](https://developers.cloudflare.com/containers/pricing/)
- [Cloudflare Containers — FAQ (ephemeral disk)](https://developers.cloudflare.com/containers/faq/)
- [Cloudflare Containers — lifecycle/architecture](https://developers.cloudflare.com/containers/platform-details/architecture/)
- [Astro — deploy to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Durable Object Container class](https://developers.cloudflare.com/durable-objects/api/container/)
