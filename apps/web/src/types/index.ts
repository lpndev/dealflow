export type {
  ExtractedDeal as Draft,
  DeliveryResult,
  QueueItem,
  Settings,
} from "@dealflow/shared";

export type Form = {
  title: string;
  imageUrl: string;
  originalPrice: string;
  currentPrice: string;
  coupon: string;
  sourceUrl: string;
  affiliateUrl: string;
  externalId: string;
};

export type Destination = { id: string; name: string; enabled: boolean };

export type ApiKeyInfo = {
  id: string;
  name: string;
  start: string | null;
  createdAt: string;
};
