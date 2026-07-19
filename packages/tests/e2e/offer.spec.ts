import { expect, test } from "@playwright/test";
import { signUpAndOnboard } from "./support/auth";
import { importOffer, saveWithAffiliate } from "./support/offer";

test.beforeEach(async ({ page }) => {
  await signUpAndOnboard(page);
  await page.getByRole("link", { name: "Nova oferta" }).click();
  await expect(page).toHaveURL(/\/new$/);
});

test("imports a product, refuses to publish without our affiliate link, then sends", async ({
  page,
}) => {
  await importOffer(page);

  // real parse of the (faked) ML page populated the price
  await expect(page.locator("#review-current")).toHaveValue("299.9");

  // fail-closed invariant: a pasted product never yields an affiliate link
  await expect(page.locator("#review-affiliate")).toHaveValue("");
  await expect(
    page.getByText(/Extensão do Dealflow não instalada/),
  ).toBeVisible();

  await saveWithAffiliate(page);

  await page.getByRole("button", { name: "Sincronizar grupos" }).click();
  const group = page.getByRole("checkbox", { name: "Ofertas Top" });
  await expect(group).toBeVisible();
  await group.click();
  await page.getByRole("checkbox", { name: "Achadinhos" }).click();

  await page.getByRole("button", { name: "Enviar agora" }).click();

  // both deliveries report sent (green check), none failed
  await expect(page.locator("li svg.text-emerald-500")).toHaveCount(2);
  await expect(page.locator("li svg.text-destructive")).toHaveCount(0);
});

test("schedules the offer into the queue instead of sending now", async ({
  page,
}) => {
  await importOffer(page);
  await saveWithAffiliate(page);

  await page.getByRole("button", { name: "Sincronizar grupos" }).click();
  await page.getByRole("checkbox", { name: "Ofertas Top" }).click();

  await page.getByRole("button", { name: "Agendar envio" }).click();

  await expect(page).toHaveURL(/\/queue$/);
  // the persisted queue row (retries past the transient empty-state/toast)
  await expect(page.getByText("Ofertas Top")).toBeVisible();
  await expect(page.getByText("Air Fryer 5L Mondial")).toBeVisible();
});
