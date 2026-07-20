import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { cors } from "hono/cors"
import { dashboard } from "@/features/dashboard/route"
import { capture } from "@/features/deals/capture/route"
import { deals } from "@/features/deals/import/route"
import { destinations } from "@/features/destinations/route"
import { plans } from "@/features/plans/route"
import { publications } from "@/features/publications/route"
import { schedule } from "@/features/publications/schedule/route"
import { send } from "@/features/publications/send/route"
import { queue } from "@/features/queue/route"
import { apiKeys } from "@/features/settings/api-keys/route"
import { settingsRoutes } from "@/features/settings/route"
import { whatsapp } from "@/features/whatsapp/route"
import { workspaceDanger } from "@/features/workspace/danger/route"
import { auth, type AppEnv } from "@/shared/auth"
import { trustedOriginSet } from "@/shared/auth/trusted-origins"

export const app = new Hono<AppEnv>()

app.use(
  "*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (c) => c.json({ error: "request body too large" }, 413)
  })
)

app.use("*", async (c, next) => {
  const origin = c.req.header("origin")
  const apiKeyRequest = c.req.path === "/deals/capture"
  if (origin && !trustedOriginSet.has(origin) && !apiKeyRequest) {
    return c.json({ error: "forbidden origin" }, 403)
  }
  await next()
})

app.use(
  "/*",
  cors({
    origin: (origin) => (trustedOriginSet.has(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["content-type", "x-api-key"]
  })
)

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set("user", session?.user ?? null)
  c.set("session", session?.session ?? null)
  await next()
})

app.get("/health", (c) => c.json({ status: "ok" }))
app.route("/deals", deals)
app.route("/deals", capture)
app.route("/publications", publications)
app.route("/publications", send)
app.route("/publications", schedule)
app.route("/destinations", destinations)
app.route("/plan", plans)
app.route("/settings", settingsRoutes)
app.route("/api-keys", apiKeys)
app.route("/workspace", workspaceDanger)
app.route("/wa", whatsapp)
app.route("/", queue)
app.route("/", dashboard)

export default app
