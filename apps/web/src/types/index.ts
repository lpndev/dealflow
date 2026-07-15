export type {
  ExtractedDeal as Draft,
  Destination,
  DeliveryResult,
  PublicationDraft as Form,
  QueueItem,
  Settings,
} from "@dealflow/shared";

export type ApiKeyInfo = {
  id: string;
  name: string;
  start: string | null;
  createdAt: string;
};
