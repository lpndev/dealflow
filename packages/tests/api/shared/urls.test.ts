import { expect, it } from "vitest"
import { extractUrls, normalizeUrl } from "@/shared/urls"

it("extracts a bare url", () => {
  expect(extractUrls("https://mercadolivre.com.br/p/MLB123")).toEqual([
    "https://mercadolivre.com.br/p/MLB123"
  ])
})

it("extracts a url from inside a message", () => {
  const msg = "🔥 Air Fryer\nPor R$ 299\nhttps://mercadolivre.com.br/p/MLB123"
  expect(extractUrls(msg)).toEqual(["https://mercadolivre.com.br/p/MLB123"])
})

it("extracts multiple urls preserving order", () => {
  const msg = "https://a.com/1 e depois https://b.com/2"
  expect(extractUrls(msg)).toEqual(["https://a.com/1", "https://b.com/2"])
})

it("drops trailing sentence punctuation", () => {
  expect(extractUrls("veja https://a.com/x.")).toEqual(["https://a.com/x"])
})

it("returns empty when there is no url", () => {
  expect(extractUrls("nenhum link aqui")).toEqual([])
})

it("strips tracking query and fragment and lowercases host", () => {
  expect(
    normalizeUrl("https://www.MercadoLivre.com.br/produto/p/MLB123?utm=x#frag")
  ).toBe("https://www.mercadolivre.com.br/produto/p/MLB123")
})
