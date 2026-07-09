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
};

export type Destination = { id: string; name: string };
