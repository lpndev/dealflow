import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { and, eq, type SQL } from "drizzle-orm";
import { getDb, type Db } from "@/shared/db";
import { member, user } from "@/shared/schema";

const MANAGERIAL = ["owner", "admin"];

const roles = (value: string | null | undefined): string[] =>
  value ? value.split(",").map((r) => r.trim()) : [];

export const isOwner = (role: string | null | undefined): boolean =>
  roles(role).includes("owner");

const isManagerial = (role: string | null | undefined): boolean =>
  roles(role).some((r) => MANAGERIAL.includes(r));

export function hierarchyAllows(input: {
  actorRole: string | null;
  targetRole?: string | null;
  requestedRole?: string | null;
}): boolean {
  if (isOwner(input.actorRole)) return true;
  return !isManagerial(input.targetRole) && !isManagerial(input.requestedRole);
}

const GUARDED = new Set([
  "/organization/update-member-role",
  "/organization/remove-member",
  "/organization/invite-member",
]);

function memberRoleWhere(db: Db, where: SQL | undefined): string | null {
  return (
    db.select({ role: member.role }).from(member).where(where).get()?.role ??
    null
  );
}

function resolveTargetRole(
  db: Db,
  path: string,
  body: Record<string, unknown>,
  orgId: string,
): string | null {
  if (path === "/organization/update-member-role") {
    return typeof body.memberId === "string"
      ? memberRoleWhere(db, eq(member.id, body.memberId))
      : null;
  }
  if (path === "/organization/remove-member") {
    const ref = body.memberIdOrEmail;
    if (typeof ref !== "string") return null;
    if (ref.includes("@")) {
      return (
        db
          .select({ role: member.role })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(and(eq(user.email, ref), eq(member.organizationId, orgId)))
          .get()?.role ?? null
      );
    }
    return memberRoleWhere(db, eq(member.id, ref));
  }
  return null;
}

function requestedRole(role: unknown): string | null {
  if (typeof role === "string") return role;
  if (Array.isArray(role)) return role.join(",");
  return null;
}

export const hierarchyGuard = createAuthMiddleware(async (ctx) => {
  if (!GUARDED.has(ctx.path)) return;
  const session = await getSessionFromCtx(ctx).catch(() => null);
  const userId = session?.user?.id;
  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const orgId =
    (typeof body.organizationId === "string" && body.organizationId) ||
    session?.session?.activeOrganizationId;
  if (!userId || !orgId) return;

  const db = getDb();
  const allowed = hierarchyAllows({
    actorRole: memberRoleWhere(
      db,
      and(eq(member.userId, userId), eq(member.organizationId, orgId)),
    ),
    targetRole: resolveTargetRole(db, ctx.path, body, orgId),
    requestedRole: requestedRole(body.role),
  });
  if (!allowed) throw new APIError("FORBIDDEN", { message: "forbidden" });
});
