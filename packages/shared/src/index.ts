export type ExtractedDeal = {
  sourceUrl: string;
  affiliateUrl?: string;
  product: {
    externalId?: string;
    title?: string;
    imageUrl?: string;
  };
  price: {
    original?: number;
    current?: number;
  };
  coupon?: string;
};

export type DeliveryResult = {
  destinationId: string;
  status: "sent" | "failed";
  error?: string;
};

export type Settings = {
  delayMinSeconds: number;
  delayMaxSeconds: number;
  queuePaused: boolean;
  messageTemplate: string;
  mlAffiliateTag: string | null;
};

export type QueueItem = {
  id: string;
  publicationId: string;
  title: string | null;
  imageUrl: string | null;
  destinationName: string;
  status: string;
  dueAt: string | null;
  sentAt: string | null;
  error: string | null;
};
