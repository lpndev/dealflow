import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/shared/db";
import { member, user } from "@/shared/schema";

const MANAGERIAL = ["owner", "admin"];

const roles = (value: string | null | undefined): string[] =>
  value ? value.split(",").map((r) => r.trim()) : [];

const isOwner = (role: string | null | undefined): boolean =>
  roles(role).includes("owner");

const isManagerial = (role: string | null | undefined): boolean =>
  roles(role).some((r) => MANAGERIAL.includes(r));

export class HierarchyError extends Error {}

export function assertHierarchy(input: {
  actorRole: string | null;
  targetRole?: string | null;
  requestedRole?: string | null;
}): void {
  if (isOwner(input.actorRole)) return;
  if (isManagerial(input.targetRole) || isManagerial(input.requestedRole)) {
    throw new HierarchyError();
  }
}

const GUARDED = new Set([
  "/organization/update-member-role",
  "/organization/remove-member",
  "/organization/invite-member",
]);

type Db = ReturnType<typeof getDb>;

function memberRole(db: Db, memberId: string): string | null {
  return (
    db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, memberId))
      .get()?.role ?? null
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
      ? memberRole(db, body.memberId)
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
    return memberRole(db, ref);
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
  const actorRole =
    db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
      .get()?.role ?? null;

  try {
    assertHierarchy({
      actorRole,
      targetRole: resolveTargetRole(db, ctx.path, body, orgId),
      requestedRole: requestedRole(body.role),
    });
  } catch {
    throw new APIError("FORBIDDEN", { message: "forbidden" });
  }
});
