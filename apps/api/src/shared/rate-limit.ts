import { createMiddleware } from "hono/factory";
import type { AppEnv } from "./auth/require-auth";

export function rateLimit(max: number, windowSeconds: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return createMiddleware<AppEnv>(async (c, next) => {
    if (process.env.DEALFLOW_E2E) {
      await next();
      return;
    }
    const key = c.get("workspaceId");
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    } else if (++entry.count > max) {
      return c.json({ error: "too many requests" }, 429);
    }
    await next();
  });
}
