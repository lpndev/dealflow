import { type Draft, type Form } from "@/types";

export const emptyForm: Form = {
  title: "",
  imageUrl: "",
  originalPrice: "",
  currentPrice: "",
  coupon: "",
  sourceUrl: "",
  affiliateUrl: "",
};

export function draftToForm(draft: Draft): Form {
  return {
    ...emptyForm,
    title: draft.product.title ?? "",
    imageUrl: draft.product.imageUrl ?? "",
    originalPrice: draft.price.original?.toString() ?? "",
    currentPrice: draft.price.current?.toString() ?? "",
    coupon: draft.coupon ?? "",
    sourceUrl: draft.sourceUrl,
    affiliateUrl: draft.affiliateUrl ?? "",
  };
}
