import { expect, test } from "@playwright/test";
import { PASSWORD, signUpAndOnboard, uniqueEmail } from "./support/auth";

test("redirects an unauthenticated visitor to login", async ({ page }) => {
  await page.goto("/queue");
  await expect(page).toHaveURL(/\/login/);
});

test("signs up, onboards a workspace, and lands on the dashboard", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await expect(page.getByRole("link", { name: "Fila" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nova oferta" })).toBeVisible();
});

test("keeps a logged-in user out of login and signup", async ({ page }) => {
  await signUpAndOnboard(page);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Fila" })).toBeVisible();

  await page.goto("/signup");
  await expect(page).toHaveURL(/\/$/);
});

test("signs out, blocks protected routes, then re-logs in", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUpAndOnboard(page, { email });

  await page.getByRole("button", { name: "Conta" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/new");
  await expect(page).toHaveURL(/\/login/);

  await page.fill("#login-email", email);
  await page.fill("#login-password", PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("link", { name: "Fila" })).toBeVisible();
});
