import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx
} from "better-auth/api"
import { and, eq, type SQL } from "drizzle-orm"
import { getDb, type Db } from "@/shared/db"
import { canAddMember } from "@/shared/plans"
import { member, user } from "@/shared/schema"
import { isOwner } from "./workspace-access"

const MANAGERIAL = ["owner", "admin"]

const roles = (value: string | null | undefined): string[] =>
  value ? value.split(",").map((r) => r.trim()) : []

const isManagerial = (role: string | null | undefined): boolean =>
  roles(role).some((r) => MANAGERIAL.includes(r))

export function hierarchyAllows(input: {
  actorRole: string | null
  targetRole?: string | null
  requestedRole?: string | null
}): boolean {
  if (isOwner(input.actorRole)) return true
  return !isManagerial(input.targetRole) && !isManagerial(input.requestedRole)
}

const GUARDED = new Set([
  "/organization/update-member-role",
  "/organization/remove-member",
  "/organization/invite-member"
])

async function memberRoleWhere(
  db: Db,
  where: SQL | undefined
): Promise<string | null> {
  const row = await db
    .select({ role: member.role })
    .from(member)
    .where(where)
    .get()
  return row?.role ?? null
}

async function resolveTargetRole(
  db: Db,
  path: string,
  body: Record<string, unknown>,
  orgId: string
): Promise<string | null> {
  if (path === "/organization/update-member-role") {
    return typeof body.memberId === "string"
      ? memberRoleWhere(db, eq(member.id, body.memberId))
      : null
  }
  if (path === "/organization/remove-member") {
    const ref = body.memberIdOrEmail
    if (typeof ref !== "string") return null
    if (ref.includes("@")) {
      const row = await db
        .select({ role: member.role })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(user.email, ref), eq(member.organizationId, orgId)))
        .get()
      return row?.role ?? null
    }
    return memberRoleWhere(db, eq(member.id, ref))
  }
  return null
}

function requestedRole(role: unknown): string | null {
  if (typeof role === "string") return role
  if (Array.isArray(role)) return role.join(",")
  return null
}

export const hierarchyGuard = createAuthMiddleware(async (ctx) => {
  if (!GUARDED.has(ctx.path)) return
  const session = (await getSessionFromCtx(ctx).catch(() => null)) as {
    user?: { id?: string }
    session?: { activeOrganizationId?: string | null }
  } | null
  const userId = session?.user?.id
  const body = (ctx.body ?? {}) as Record<string, unknown>
  const orgId =
    (typeof body.organizationId === "string" && body.organizationId) ||
    session?.session?.activeOrganizationId
  if (!userId || !orgId) return

  const db = getDb()
  const allowed = hierarchyAllows({
    actorRole: await memberRoleWhere(
      db,
      and(eq(member.userId, userId), eq(member.organizationId, orgId))
    ),
    targetRole: await resolveTargetRole(db, ctx.path, body, orgId),
    requestedRole: requestedRole(body.role)
  })
  if (!allowed) throw new APIError("FORBIDDEN", { message: "forbidden" })

  if (
    ctx.path === "/organization/invite-member" &&
    !(await canAddMember(db, orgId))
  ) {
    throw new APIError("FORBIDDEN", {
      message:
        "Limite de membros do plano atingido. Faça upgrade para convidar mais."
    })
  }
})
