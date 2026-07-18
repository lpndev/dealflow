import type {
  Plan,
  PlanId,
  PlanStatus,
  WorkspaceUsage,
} from "@dealflow/shared";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { isOwner, ownedWorkspaceIds } from "./auth/workspace-access";
import type { Db } from "./db";
import { PlanLimitError } from "./errors";
import {
  accountPlan,
  delivery,
  destination,
  invitation,
  member,
  user,
} from "./schema";

export const TRIAL_DAYS = 7;

// ponytail: prices TBD (operator decides later); landing reads these over the wire.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Grátis",
    priceBrl: 0,
    limits: {
      sendsPerMonth: 100,
      destinations: 3,
      members: 1,
      workspaces: 1,
      whatsappNumbers: 1,
      mlAccounts: 1,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceBrl: null,
    limits: {
      sendsPerMonth: 1000,
      destinations: 10,
      members: 2,
      workspaces: 1,
      whatsappNumbers: 1,
      mlAccounts: 1,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceBrl: null,
    limits: {
      sendsPerMonth: 5000,
      destinations: 30,
      members: 5,
      workspaces: 3,
      whatsappNumbers: 2,
      mlAccounts: 3,
    },
  },
  business: {
    id: "business",
    name: "Business",
    priceBrl: null,
    limits: {
      sendsPerMonth: null,
      destinations: null,
      members: null,
      workspaces: null,
      whatsappNumbers: 5,
      mlAccounts: 10,
    },
  },
};

const SELF_HOST_PLAN: Plan = {
  id: "free",
  name: "Self-host",
  priceBrl: 0,
  limits: {
    sendsPerMonth: null,
    destinations: null,
    members: null,
    workspaces: null,
    whatsappNumbers: null,
    mlAccounts: null,
  },
};

export const isSelfHost = (): boolean => process.env.SELF_HOST === "true";

function ownerOf(db: Db, workspaceId: string): string | null {
  const rows = db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, workspaceId))
    .all();
  return rows.find((r) => isOwner(r.role))?.userId ?? null;
}

function storedPlanId(db: Db, userId: string): PlanId {
  const id = db
    .select({ plan: accountPlan.plan })
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .get()?.plan;
  return id && id in PLANS ? (id as PlanId) : "free";
}

function userCreatedAt(db: Db, userId: string): Date | null {
  return (
    db
      .select({ createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, userId))
      .get()?.createdAt ?? null
  );
}

export type ResolvedPlan = {
  plan: Plan;
  selfHost: boolean;
  ownerId: string | null;
  trialEndsAt: Date | null;
  trialExpired: boolean;
};

export function resolvePlanForUser(
  db: Db,
  userId: string,
  now: Date = new Date(),
): ResolvedPlan {
  if (isSelfHost()) {
    return {
      plan: SELF_HOST_PLAN,
      selfHost: true,
      ownerId: userId,
      trialEndsAt: null,
      trialExpired: false,
    };
  }

  const id = storedPlanId(db, userId);
  const plan = PLANS[id];
  if (id !== "free") {
    return {
      plan,
      selfHost: false,
      ownerId: userId,
      trialEndsAt: null,
      trialExpired: false,
    };
  }

  const created = userCreatedAt(db, userId);
  const trialEndsAt = created
    ? new Date(created.getTime() + TRIAL_DAYS * 86_400_000)
    : null;
  const trialExpired = trialEndsAt
    ? now.getTime() >= trialEndsAt.getTime()
    : false;
  return { plan, selfHost: false, ownerId: userId, trialEndsAt, trialExpired };
}

export function resolvePlanForWorkspace(
  db: Db,
  workspaceId: string,
  now: Date = new Date(),
): ResolvedPlan {
  if (isSelfHost()) {
    return {
      plan: SELF_HOST_PLAN,
      selfHost: true,
      ownerId: null,
      trialEndsAt: null,
      trialExpired: false,
    };
  }
  const owner = ownerOf(db, workspaceId);
  // ponytail: orphan workspace (no owner member) — treat as free-active, never crash.
  if (!owner) {
    return {
      plan: PLANS.free,
      selfHost: false,
      ownerId: null,
      trialEndsAt: null,
      trialExpired: false,
    };
  }
  return resolvePlanForUser(db, owner, now);
}

function scopeIds(
  db: Db,
  resolved: ResolvedPlan,
  workspaceId: string | null,
): string[] {
  if (resolved.ownerId) return ownedWorkspaceIds(db, resolved.ownerId);
  return workspaceId ? [workspaceId] : [];
}

function sendsThisMonth(db: Db, ids: string[], now: Date): number {
  if (ids.length === 0) return 0;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return (
    db
      .select({ n: count() })
      .from(delivery)
      .where(
        and(
          inArray(delivery.workspaceId, ids),
          eq(delivery.status, "sent"),
          gte(delivery.sentAt, monthStart),
        ),
      )
      .get()?.n ?? 0
  );
}

function queuedSends(db: Db, ids: string[]): number {
  if (ids.length === 0) return 0;
  return (
    db
      .select({ n: count() })
      .from(delivery)
      .where(
        and(
          inArray(delivery.workspaceId, ids),
          inArray(delivery.status, ["scheduled", "processing"]),
        ),
      )
      .get()?.n ?? 0
  );
}

// ponytail: queued (scheduled/processing) deliveries count toward the monthly
// cap so a burst of schedules can't outrun the limit before any dispatch. Month
// attribution is approximate (all pending counted, not just this month's dueAt);
// fail-closed and fine for the MVP's send volume.
function usedSends(db: Db, ids: string[], now: Date): number {
  return sendsThisMonth(db, ids, now) + queuedSends(db, ids);
}

function enabledDestinations(db: Db, ids: string[]): number {
  if (ids.length === 0) return 0;
  return (
    db
      .select({ n: count() })
      .from(destination)
      .where(
        and(
          inArray(destination.workspaceId, ids),
          eq(destination.enabled, true),
        ),
      )
      .get()?.n ?? 0
  );
}

function memberSlotsUsed(db: Db, ids: string[]): number {
  if (ids.length === 0) return 0;
  const memberUserIds = new Set(
    db
      .select({ userId: member.userId })
      .from(member)
      .where(inArray(member.organizationId, ids))
      .all()
      .map((r) => r.userId),
  );
  const pending =
    db
      .select({ n: count() })
      .from(invitation)
      .where(
        and(
          inArray(invitation.organizationId, ids),
          eq(invitation.status, "pending"),
        ),
      )
      .get()?.n ?? 0;
  return memberUserIds.size + pending;
}

function usageForScope(db: Db, ids: string[], now: Date): WorkspaceUsage {
  return {
    sendsThisMonth: usedSends(db, ids, now),
    destinations: enabledDestinations(db, ids),
    members: memberSlotsUsed(db, ids),
    workspaces: ids.length,
  };
}

function toStatus(
  db: Db,
  r: ResolvedPlan,
  ids: string[],
  now: Date,
): PlanStatus {
  return {
    planId: r.plan.id,
    name: r.plan.name,
    selfHost: r.selfHost,
    trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
    trialExpired: r.trialExpired,
    limits: r.plan.limits,
    usage: usageForScope(db, ids, now),
  };
}

export function planStatusForUser(
  db: Db,
  userId: string,
  now: Date = new Date(),
): PlanStatus {
  const r = resolvePlanForUser(db, userId, now);
  return toStatus(db, r, scopeIds(db, r, null), now);
}

export function planStatusForWorkspace(
  db: Db,
  workspaceId: string,
  now: Date = new Date(),
): PlanStatus {
  const r = resolvePlanForWorkspace(db, workspaceId, now);
  return toStatus(db, r, scopeIds(db, r, workspaceId), now);
}

const TRIAL_OVER =
  "Seu período de teste terminou. Assine um plano para continuar.";

export function assertCanSend(
  db: Db,
  workspaceId: string,
  adding: number,
  now: Date = new Date(),
): void {
  const r = resolvePlanForWorkspace(db, workspaceId, now);
  if (r.selfHost) return;
  if (r.trialExpired) throw new PlanLimitError(TRIAL_OVER);
  const limit = r.plan.limits.sendsPerMonth;
  if (limit === null) return;
  const ids = scopeIds(db, r, workspaceId);
  if (usedSends(db, ids, now) + adding > limit) {
    throw new PlanLimitError(
      `Limite de ${limit} envios/mês do plano ${r.plan.name} atingido.`,
    );
  }
}

export function assertCanEnableDestination(
  db: Db,
  workspaceId: string,
  now: Date = new Date(),
): void {
  const r = resolvePlanForWorkspace(db, workspaceId, now);
  if (r.selfHost) return;
  if (r.trialExpired) throw new PlanLimitError(TRIAL_OVER);
  const limit = r.plan.limits.destinations;
  if (limit === null) return;
  const ids = scopeIds(db, r, workspaceId);
  if (enabledDestinations(db, ids) >= limit) {
    throw new PlanLimitError(
      `Limite de ${limit} grupos do plano ${r.plan.name} atingido.`,
    );
  }
}

export function destinationSlotsLeft(
  db: Db,
  workspaceId: string,
  now: Date = new Date(),
): number {
  const r = resolvePlanForWorkspace(db, workspaceId, now);
  if (r.selfHost) return Infinity;
  if (r.trialExpired) return 0;
  const limit = r.plan.limits.destinations;
  if (limit === null) return Infinity;
  const ids = scopeIds(db, r, workspaceId);
  return Math.max(0, limit - enabledDestinations(db, ids));
}

export function canAddMember(
  db: Db,
  workspaceId: string,
  now: Date = new Date(),
): boolean {
  const r = resolvePlanForWorkspace(db, workspaceId, now);
  if (r.selfHost) return true;
  if (r.trialExpired) return false;
  const limit = r.plan.limits.members;
  if (limit === null) return true;
  const ids = scopeIds(db, r, workspaceId);
  return memberSlotsUsed(db, ids) < limit;
}

export function canCreateWorkspace(
  db: Db,
  userId: string,
  now: Date = new Date(),
): boolean {
  const r = resolvePlanForUser(db, userId, now);
  if (r.selfHost) return true;
  if (r.trialExpired) return false;
  const limit = r.plan.limits.workspaces;
  if (limit === null) return true;
  return ownedWorkspaceIds(db, userId).length < limit;
}
