export type ExtractedDeal = {
  sourceUrl: string
  affiliateUrl?: string
  product: {
    externalId?: string
    title?: string
    imageUrl?: string
  }
  price: {
    original?: number
    current?: number
  }
  coupon?: string
}

export type PublicationDraft = {
  title: string
  imageUrl: string
  originalPrice: string
  currentPrice: string
  coupon: string
  sourceUrl: string
  affiliateUrl: string
  externalId: string
}

export type Destination = {
  id: string
  name: string
  enabled: boolean
}

export type DeliveryResult = {
  destinationId: string
  status: "sent" | "failed"
  error?: string
}

export type MessagingDestination = {
  provider: string
  externalId: string
  name: string
}

export type SendMessageInput = {
  sessionId: string
  destinationExternalId: string
  content: string
  imageUrl?: string
}

export type SendMessageResult = { externalMessageId: string }

export type MessagingSession = {
  connection: string
  qr: string | null
}

export type GatewaySession = {
  connection: string
  hasQr: boolean
}

export type GatewayGroup = { id: string; name: string }

export type GatewayMessage = Omit<SendMessageInput, "sessionId">

export type PageMessage =
  | { source: "dealflow"; type: "ping" }
  | { source: "dealflow"; type: "mint"; sourceUrl: string }
  | { source: "dealflow-ext"; type: "pong" }
  | { source: "dealflow-ext"; type: "mint-error"; error?: string }

export type Settings = {
  delayMinSeconds: number
  delayMaxSeconds: number
  queuePaused: boolean
  messageTemplate: string
  mlAffiliateTag: string | null
}

export type PlanId = "free" | "starter" | "pro" | "business"

export type PlanLimits = {
  sendsPerMonth: number | null
  destinations: number | null
  members: number | null
  workspaces: number | null
  whatsappNumbers: number | null
  mlAccounts: number | null
}

export type Plan = {
  id: PlanId
  name: string
  priceBrl: number | null
  limits: PlanLimits
}

export type WorkspaceUsage = {
  sendsThisMonth: number
  destinations: number
  members: number
  workspaces: number
}

export type PlanStatus = {
  planId: PlanId
  name: string
  selfHost: boolean
  trialEndsAt: string | null
  trialExpired: boolean
  limits: PlanLimits
  usage: WorkspaceUsage
}

export type DashboardRange = "day" | "week" | "month" | "year"

export type DashboardBucket = { bucket: string; sent: number; failed: number }

export type DashboardData = {
  range: DashboardRange
  sent: number
  pending: number
  groups: number
  failed: number
  series: DashboardBucket[]
}

export type QueueItem = {
  id: string
  publicationId: string
  title: string | null
  imageUrl: string | null
  destinationName: string
  status: string
  dueAt: string | null
  sentAt: string | null
  error: string | null
}
