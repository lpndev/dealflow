import { startScheduler } from "@/features/publications/schedule/scheduler"
import { whatsappGateway } from "@/integrations/whatsapp/gateway"
import { getDb } from "@/shared/db"
import app from "./app"

const hostname = process.env.HOST ?? "127.0.0.1"
const loopback = new Set(["127.0.0.1", "localhost", "::1"])
const secret = process.env.BETTER_AUTH_SECRET
if (!loopback.has(hostname) && (!secret || secret === "dev-secret-change-me")) {
  throw new Error(
    "a strong BETTER_AUTH_SECRET is required when HOST is not loopback"
  )
}

startScheduler(getDb(), whatsappGateway)

export default {
  port: Number(process.env.PORT) || 3001,
  hostname,
  fetch: app.fetch
}
