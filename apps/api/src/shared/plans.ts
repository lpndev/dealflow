import type { Plan, PlanId, PlanStatus, WorkspaceUsage } from "@dealflow/shared"
import { and, count, eq, gte, inArray } from "drizzle-orm"
import { isOwner, ownedWorkspaceIds } from "./auth/workspace-access"
import type { Db } from "./db"
import { PlanLimitError } from "./errors"
import {
  accountPlan,
  delivery,
  destination,
  invitation,
  member,
  user
} from "./schema"

export const TRIAL_DAYS = 7

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
      mlAccounts: 1
    }
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
      mlAccounts: 1
    }
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
      mlAccounts: 3
    }
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
      mlAccounts: 10
    }
  }
}

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
    mlAccounts: null
  }
}

export const isSelfHost = (): boolean => process.env.SELF_HOST === "true"

async function ownerOf(db: Db, workspaceId: string): Promise<string | null> {
  const rows = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, workspaceId))
    .all()
  return rows.find((r) => isOwner(r.role))?.userId ?? null
}

async function storedPlanId(db: Db, userId: string): Promise<PlanId> {
  const row = await db
    .select({ plan: accountPlan.plan })
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .get()
  const id = row?.plan
  return id && id in PLANS ? (id as PlanId) : "free"
}

async function userCreatedAt(db: Db, userId: string): Promise<Date | null> {
  const row = await db
    .select({ createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
    .get()
  return row?.createdAt ?? null
}

export type ResolvedPlan = {
  plan: Plan
  selfHost: boolean
  ownerId: string | null
  trialEndsAt: Date | null
  trialExpired: boolean
}

export async function resolvePlanForUser(
  db: Db,
  userId: string,
  now: Date = new Date()
): Promise<ResolvedPlan> {
  if (isSelfHost()) {
    return {
      plan: SELF_HOST_PLAN,
      selfHost: true,
      ownerId: userId,
      trialEndsAt: null,
      trialExpired: false
    }
  }

  const id = await storedPlanId(db, userId)
  const plan = PLANS[id]
  if (id !== "free") {
    return {
      plan,
      selfHost: false,
      ownerId: userId,
      trialEndsAt: null,
      trialExpired: false
    }
  }

  const created = await userCreatedAt(db, userId)
  const trialEndsAt = created
    ? new Date(created.getTime() + TRIAL_DAYS * 86_400_000)
    : null
  const trialExpired = trialEndsAt
    ? now.getTime() >= trialEndsAt.getTime()
    : false
  return { plan, selfHost: false, ownerId: userId, trialEndsAt, trialExpired }
}

export async function resolvePlanForWorkspace(
  db: Db,
  workspaceId: string,
  now: Date = new Date()
): Promise<ResolvedPlan> {
  if (isSelfHost()) {
    return {
      plan: SELF_HOST_PLAN,
      selfHost: true,
      ownerId: null,
      trialEndsAt: null,
      trialExpired: false
    }
  }
  const owner = await ownerOf(db, workspaceId)
  if (!owner) {
    return {
      plan: PLANS.free,
      selfHost: false,
      ownerId: null,
      trialEndsAt: null,
      trialExpired: false
    }
  }
  return resolvePlanForUser(db, owner, now)
}

async function scopeIds(
  db: Db,
  resolved: ResolvedPlan,
  workspaceId: string | null
): Promise<string[]> {
  if (resolved.ownerId) return ownedWorkspaceIds(db, resolved.ownerId)
  return workspaceId ? [workspaceId] : []
}

async function sendsThisMonth(
  db: Db,
  ids: string[],
  now: Date
): Promise<number> {
  if (ids.length === 0) return 0
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const row = await db
    .select({ n: count() })
    .from(delivery)
    .where(
      and(
        inArray(delivery.workspaceId, ids),
        eq(delivery.status, "sent"),
        gte(delivery.sentAt, monthStart)
      )
    )
    .get()
  return row?.n ?? 0
}

async function queuedSends(db: Db, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const row = await db
    .select({ n: count() })
    .from(delivery)
    .where(
      and(
        inArray(delivery.workspaceId, ids),
        inArray(delivery.status, ["scheduled", "processing"])
      )
    )
    .get()
  return row?.n ?? 0
}

async function usedSends(db: Db, ids: string[], now: Date): Promise<number> {
  const [sent, queued] = await Promise.all([
    sendsThisMonth(db, ids, now),
    queuedSends(db, ids)
  ])
  return sent + queued
}

async function enabledDestinations(db: Db, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const row = await db
    .select({ n: count() })
    .from(destination)
    .where(
      and(inArray(destination.workspaceId, ids), eq(destination.enabled, true))
    )
    .get()
  return row?.n ?? 0
}

async function memberSlotsUsed(db: Db, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const [rows, pendingRow] = await Promise.all([
    db
      .select({ userId: member.userId })
      .from(member)
      .where(inArray(member.organizationId, ids))
      .all(),
    db
      .select({ n: count() })
      .from(invitation)
      .where(
        and(
          inArray(invitation.organizationId, ids),
          eq(invitation.status, "pending")
        )
      )
      .get()
  ])
  return new Set(rows.map((r) => r.userId)).size + (pendingRow?.n ?? 0)
}

async function usageForScope(
  db: Db,
  ids: string[],
  now: Date
): Promise<WorkspaceUsage> {
  const [sendsThisMonth, destinations, members] = await Promise.all([
    usedSends(db, ids, now),
    enabledDestinations(db, ids),
    memberSlotsUsed(db, ids)
  ])
  return { sendsThisMonth, destinations, members, workspaces: ids.length }
}

async function toStatus(
  db: Db,
  r: ResolvedPlan,
  ids: string[],
  now: Date
): Promise<PlanStatus> {
  return {
    planId: r.plan.id,
    name: r.plan.name,
    selfHost: r.selfHost,
    trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
    trialExpired: r.trialExpired,
    limits: r.plan.limits,
    usage: await usageForScope(db, ids, now)
  }
}

export async function planStatusForUser(
  db: Db,
  userId: string,
  now: Date = new Date()
): Promise<PlanStatus> {
  const r = await resolvePlanForUser(db, userId, now)
  return toStatus(db, r, await scopeIds(db, r, null), now)
}

export async function planStatusForWorkspace(
  db: Db,
  workspaceId: string,
  now: Date = new Date()
): Promise<PlanStatus> {
  const r = await resolvePlanForWorkspace(db, workspaceId, now)
  return toStatus(db, r, await scopeIds(db, r, workspaceId), now)
}

const TRIAL_OVER =
  "Seu período de teste terminou. Assine um plano para continuar."

export async function assertCanSend(
  db: Db,
  workspaceId: string,
  adding: number,
  now: Date = new Date()
): Promise<void> {
  const r = await resolvePlanForWorkspace(db, workspaceId, now)
  if (r.selfHost) return
  if (r.trialExpired) throw new PlanLimitError(TRIAL_OVER)
  const limit = r.plan.limits.sendsPerMonth
  if (limit === null) return
  const ids = await scopeIds(db, r, workspaceId)
  if ((await usedSends(db, ids, now)) + adding > limit) {
    throw new PlanLimitError(
      `Limite de ${limit} envios/mês do plano ${r.plan.name} atingido.`
    )
  }
}

export async function assertCanEnableDestination(
  db: Db,
  workspaceId: string,
  now: Date = new Date()
): Promise<void> {
  const r = await resolvePlanForWorkspace(db, workspaceId, now)
  if (r.selfHost) return
  if (r.trialExpired) throw new PlanLimitError(TRIAL_OVER)
  const limit = r.plan.limits.destinations
  if (limit === null) return
  const ids = await scopeIds(db, r, workspaceId)
  if ((await enabledDestinations(db, ids)) >= limit) {
    throw new PlanLimitError(
      `Limite de ${limit} grupos do plano ${r.plan.name} atingido.`
    )
  }
}

export async function destinationSlotsLeft(
  db: Db,
  workspaceId: string,
  now: Date = new Date()
): Promise<number> {
  const r = await resolvePlanForWorkspace(db, workspaceId, now)
  if (r.selfHost) return Infinity
  if (r.trialExpired) return 0
  const limit = r.plan.limits.destinations
  if (limit === null) return Infinity
  const ids = await scopeIds(db, r, workspaceId)
  return Math.max(0, limit - (await enabledDestinations(db, ids)))
}

export async function canAddMember(
  db: Db,
  workspaceId: string,
  now: Date = new Date()
): Promise<boolean> {
  const r = await resolvePlanForWorkspace(db, workspaceId, now)
  if (r.selfHost) return true
  if (r.trialExpired) return false
  const limit = r.plan.limits.members
  if (limit === null) return true
  const ids = await scopeIds(db, r, workspaceId)
  return (await memberSlotsUsed(db, ids)) < limit
}

export async function canCreateWorkspace(
  db: Db,
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const r = await resolvePlanForUser(db, userId, now)
  if (r.selfHost) return true
  if (r.trialExpired) return false
  const limit = r.plan.limits.workspaces
  if (limit === null) return true
  return (await ownedWorkspaceIds(db, userId)).length < limit
}
