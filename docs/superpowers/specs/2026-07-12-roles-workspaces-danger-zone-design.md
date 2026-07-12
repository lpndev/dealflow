# Roles, multi-workspace & danger zone

Reuse-heavy extension of the existing better-auth (1.6.23) organization foundation.
No new role model, no custom permission matrix — the three fixed roles
(`owner`/`admin`/`member`=Publisher) stay. We tighten *who manages whom*, surface
workspace creation, and add destructive account/workspace actions.

## Part 1 — Role hierarchy

Rank: `owner(3) > admin(2) > publisher(1)`.

better-auth already enforces server-side: publishers can't manage members; only an
owner can modify an owner or promote anyone **to** owner (`crud-members` creatorRole
gate). The only residual gap: an admin (has `member:update`/`delete`/`invitation:create`)
can promote a publisher to admin or manage a fellow admin.

**Rule to add (fail-closed):** an admin may only invite/remove **publishers** and may
not assign the `admin`/`owner` role. Concretely, for a non-owner actor, any member op
whose target role **or** requested role is `admin`/`owner` is forbidden. Owner is
unrestricted (subject to better-auth's own last-owner guard).

**Enforcement:** one request-level `hooks.before` guard (`createAuthMiddleware`) matching
`/organization/{update-member-role,remove-member,invite-member}`. It reads the actor via
`getSessionFromCtx`, resolves the actor's active-member role, looks up the target member's
current role (update/remove) and the requested role (update/invite), and calls a pure
`assertHierarchy({ actorRole, targetRole?, requestedRole? })` that throws on violation.
The pure function is the unit-tested invariant (admin cannot escalate). All three member
mutations route through this single guard.

**UI (`team.tsx`, `invite-member.tsx`):** derive viewer rank from `getActiveMember`. Show
the role dropdown only for members strictly below the viewer; the owner's dropdown gains a
"Tornar dono" (promote-to-owner) option. Invite role options: owner → admin/publisher,
admin → publisher only. No "owner" in invites (promotion-only, by decision).

## Part 2 — Create multiple workspaces

`organization.create` + switcher + per-workspace invites already work. Extract onboarding's
create+slug-collision+`setActive` into a shared `createWorkspace(name)` helper; add a
"Novo workspace" item to the existing `WorkspaceSwitcher` dropdown opening a small name
dialog. Nothing else.

## Part 3 — Danger zone (Config, bottom, destructive styling)

1. **Revogar todas as chaves** (admin+) — loop existing revoke over this workspace's keys.
2. **Excluir este workspace** (owner-only) — server cascade deletes our domain rows for the
   `workspaceId` (`product`, `deal_snapshot`, `affiliate_link`, `publication`, `delivery`,
   `destination`, `settings`) + revokes that org's api keys, then `auth.api` deletes the org.
   Confirm by typing the workspace name.
3. **Excluir minha conta** — cascade-delete every workspace the user solely owns, then
   `deleteUser({ password })` (needs `user.deleteUser.enabled`; password path, no email in
   MVP). Signs out.
4. **Resetar tudo** (nuke, keeps the account) — composed: delete all owned workspaces + data,
   revoke all keys, WhatsApp logout (gateway `POST /session/logout` already wipes `wa-auth/`;
   add `MessagingProvider.logout()` + a route), sign out. User lands in onboarding.

### Boundaries (stated in UI)
- WhatsApp gateway is **global/single-session** — logout/reset nukes the one shared session
  (fine under one-operator-today; not per-workspace).
- ML browser login + the extension's stored config live in the browser — the web app can't
  clear them. Reset covers server-side + WhatsApp + our cookies; the user clears ML/extension
  state in the browser.

### Server surface
- `hooks.before` guard + `assertHierarchy` (`shared/auth/hierarchy.ts`, tested).
- `features/workspace/danger/` — `deleteWorkspace`, `resetAll`, `revokeAllKeys` use-cases +
  routes (owner/admin gated via `requireRole`).
- `MessagingProvider.logout()` + http impl calling gateway `/session/logout`.
- `auth.ts`: `user: { deleteUser: { enabled: true } }`.
