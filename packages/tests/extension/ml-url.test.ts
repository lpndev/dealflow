import { isMercadoLivreProduct } from "@extension/content/ml-url"
import { expect, test } from "vitest"

test("accepts https mercadolivre product urls", () => {
  expect(
    isMercadoLivreProduct("https://www.mercadolivre.com.br/p/MLB123")
  ).toBe(true)
  expect(
    isMercadoLivreProduct("https://produto.mercadolivre.com.br/up/MLBU999")
  ).toBe(true)
  expect(
    isMercadoLivreProduct(
      "https://produto.mercadolivre.com.br/MLB-4287326474-serra-meia-esquadria-_JM"
    )
  ).toBe(true)
})

test("rejects non-product, wrong host, or insecure urls", () => {
  expect(isMercadoLivreProduct("https://www.mercadolivre.com.br/ofertas")).toBe(
    false
  )
  expect(isMercadoLivreProduct("http://www.mercadolivre.com.br/p/MLB123")).toBe(
    false
  )
  expect(isMercadoLivreProduct("https://evil.com/p/MLB123")).toBe(false)
  expect(isMercadoLivreProduct("not a url")).toBe(false)
})
