import { expect, type Page } from "@playwright/test"

export const PRODUCT_URL = "https://www.mercadolivre.com.br/air-fryer/p/MLB123"
export const OUR_AFFILIATE = "https://meli.la/ourlink"

/** Pastes the product URL and imports it, leaving the review form populated. */
export async function importOffer(page: Page): Promise<void> {
  await page.getByPlaceholder(/meli\.la/).fill(PRODUCT_URL)
  await page.getByRole("button", { name: "Importar oferta" }).click()
  await expect(page.locator("#review-title")).toHaveValue(
    "Air Fryer 5L Mondial"
  )
}

/** Fills our affiliate link and saves, revealing the send panel. */
export async function saveWithAffiliate(page: Page): Promise<void> {
  await page.locator("#review-affiliate").fill(OUR_AFFILIATE)
  await page.getByRole("button", { name: "Salvar publicação" }).click()
  await expect(
    page.getByRole("button", { name: "Sincronizar grupos" })
  ).toBeVisible()
}
