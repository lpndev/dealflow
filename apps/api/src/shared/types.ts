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
