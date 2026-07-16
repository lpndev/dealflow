import { expect, type Page } from "@playwright/test";

let counter = 0;

export function uniqueEmail(): string {
  counter += 1;
  return `e2e-${Date.now()}-${counter}@dealflow.test`;
}

export const PASSWORD = "e2e-password-123";

/** Signs up a fresh user and creates a workspace, landing on the dashboard. */
export async function signUpAndOnboard(
  page: Page,
  opts: { workspace?: string; email?: string } = {},
): Promise<{ email: string; workspace: string }> {
  const email = opts.email ?? uniqueEmail();
  const workspace = opts.workspace ?? `WS ${counter}`;

  await page.goto("/signup");
  await page.fill("#signup-name", "Operador E2E");
  await page.fill("#signup-email", email);
  await page.fill("#signup-password", PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.fill("#onboarding-name", workspace);
  await page.getByRole("button", { name: "Criar workspace" }).click();

  await expect(page).toHaveURL("/"); // resolved against the configured baseURL
  return { email, workspace };
}
