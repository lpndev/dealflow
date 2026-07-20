export type {
  ExtractedDeal as Draft,
  Destination,
  DeliveryResult,
  PublicationDraft as Form,
  PageMessage,
  PlanStatus,
  QueueItem,
  Settings
} from "@dealflow/shared"

export type ApiKeyInfo = {
  id: string
  name: string
  start: string | null
  createdAt: string
}
