import { createMiddleware } from "hono/factory";
import { auth } from "./auth";
import type { AppEnv } from "./require-auth";

export function parseMetadata(
  metadata: unknown,
): { organizationId?: string } | null {
  try {
    return typeof metadata === "string"
      ? JSON.parse(metadata)
      : (metadata ?? null);
  } catch {
    return null;
  }
}

export const requireApiKey = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("x-api-key");
  if (!key) return c.json({ error: "unauthorized" }, 401);

  const verified = await auth.api
    .verifyApiKey({ body: { key } })
    .catch(() => null);
  const metadata = verified?.valid ? (verified.key?.metadata ?? null) : null;
  const workspaceId = parseMetadata(metadata)?.organizationId;
  if (!workspaceId) return c.json({ error: "unauthorized" }, 401);

  c.set("workspaceId", workspaceId);
  await next();
});
