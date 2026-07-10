import { type Draft, type Form } from "@/types";

export const emptyForm: Form = {
  title: "",
  imageUrl: "",
  originalPrice: "",
  currentPrice: "",
  coupon: "",
  sourceUrl: "",
  affiliateUrl: "",
  externalId: "",
};

export function mergeCapture(form: Form, draft: Draft): Form {
  return {
    ...form,
    title: draft.product.title ?? form.title,
    imageUrl: draft.product.imageUrl ?? form.imageUrl,
    originalPrice: draft.price.original?.toString() ?? form.originalPrice,
    currentPrice: draft.price.current?.toString() ?? form.currentPrice,
    affiliateUrl: draft.affiliateUrl || form.affiliateUrl,
  };
}

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
    externalId: draft.product.externalId ?? "",
  };
}
