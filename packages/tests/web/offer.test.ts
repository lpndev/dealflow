import { describe, expect, it } from "vitest"
import { draftToForm, emptyForm, mergeCapture } from "@/lib/offer"
import type { Draft, Form } from "@/types"

const draft = (over: Partial<Draft> = {}): Draft => ({
  sourceUrl: "https://www.mercadolivre.com.br/x/p/MLB123",
  affiliateUrl: "https://meli.la/newlink",
  product: {
    externalId: "MLB123",
    title: "Air Fryer 5L",
    imageUrl: "https://img/a.jpg"
  },
  price: { original: 399.9, current: 299.9 },
  coupon: "OFERTA10",
  ...over
})

describe("mergeCapture", () => {
  it("overrides price/title/image with fresh ML data", () => {
    const stale: Form = {
      ...emptyForm,
      title: "old",
      currentPrice: "111",
      imageUrl: "old.jpg"
    }
    const merged = mergeCapture(stale, draft())
    expect(merged.title).toBe("Air Fryer 5L")
    expect(merged.currentPrice).toBe("299.9")
    expect(merged.originalPrice).toBe("399.9")
    expect(merged.imageUrl).toBe("https://img/a.jpg")
  })

  it("keeps the operator-typed coupon (never overwritten by capture)", () => {
    const typed: Form = { ...emptyForm, coupon: "MYCOUPON" }
    expect(mergeCapture(typed, draft({ coupon: "OTHER" })).coupon).toBe(
      "MYCOUPON"
    )
  })

  it("pastes a new affiliate but keeps the existing one when capture has none", () => {
    const withAff: Form = {
      ...emptyForm,
      affiliateUrl: "https://meli.la/existing"
    }
    expect(
      mergeCapture(withAff, draft({ affiliateUrl: "" })).affiliateUrl
    ).toBe("https://meli.la/existing")
    expect(mergeCapture(withAff, draft()).affiliateUrl).toBe(
      "https://meli.la/newlink"
    )
  })

  it("falls back to the current form value when a draft field is missing", () => {
    const form: Form = { ...emptyForm, title: "kept", currentPrice: "42" }
    const merged = mergeCapture(
      form,
      draft({ product: { externalId: "MLB123" }, price: {} })
    )
    expect(merged.title).toBe("kept")
    expect(merged.currentPrice).toBe("42")
  })
})

describe("draftToForm", () => {
  it("maps every draft field into string form values", () => {
    const form = draftToForm(draft())
    expect(form).toMatchObject({
      title: "Air Fryer 5L",
      imageUrl: "https://img/a.jpg",
      originalPrice: "399.9",
      currentPrice: "299.9",
      coupon: "OFERTA10",
      sourceUrl: "https://www.mercadolivre.com.br/x/p/MLB123",
      affiliateUrl: "https://meli.la/newlink",
      externalId: "MLB123"
    })
  })

  it("yields empty strings for absent optional fields (never undefined in the form)", () => {
    const form = draftToForm({
      sourceUrl: "https://x/p/MLB9",
      product: {},
      price: {}
    })
    expect(form.title).toBe("")
    expect(form.currentPrice).toBe("")
    expect(form.coupon).toBe("")
    expect(form.affiliateUrl).toBe("")
  })
})
