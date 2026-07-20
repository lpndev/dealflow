import app from "./app"
import { connect, listStoredSessions } from "./whatsapp"

const hostname = process.env.WA_GATEWAY_HOST ?? "127.0.0.1"
const loopback = new Set(["127.0.0.1", "localhost", "::1"])
if (!loopback.has(hostname) && !process.env.WA_GATEWAY_TOKEN) {
  throw new Error(
    "WA_GATEWAY_TOKEN is required when WA_GATEWAY_HOST is not loopback"
  )
}

void listStoredSessions().then((ids) => {
  for (const id of ids) void connect(id)
})

export default {
  port: Number(process.env.WA_GATEWAY_PORT) || 3002,
  hostname,
  fetch: app.fetch
}
