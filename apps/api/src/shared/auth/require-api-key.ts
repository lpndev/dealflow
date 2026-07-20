import { createMiddleware } from "hono/factory"
import { getDb } from "@/shared/db"
import { auth } from "./auth"
import type { AppEnv } from "./require-auth"
import { isWorkspaceMember } from "./workspace-access"

export function parseMetadata(
  metadata: unknown
): { organizationId?: string } | null {
  try {
    const parsed: unknown =
      typeof metadata === "string" ? JSON.parse(metadata) : metadata
    return typeof parsed === "object" && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

export const requireApiKey = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("x-api-key")
  if (!key) return c.json({ error: "unauthorized" }, 401)

  const verified = await auth.api
    .verifyApiKey({ body: { key } })
    .catch(() => null)
  const metadata = verified?.valid ? (verified.key?.metadata ?? null) : null
  const workspaceId = parseMetadata(metadata)?.organizationId
  const ownerId = verified?.key?.referenceId
  if (
    !workspaceId ||
    !ownerId ||
    !isWorkspaceMember(getDb(), ownerId, workspaceId)
  ) {
    return c.json({ error: "unauthorized" }, 401)
  }

  c.set("workspaceId", workspaceId)
  await next()
})
