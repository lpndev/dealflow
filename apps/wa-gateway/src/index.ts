import app from "./app";
import { connect, listStoredSessions } from "./whatsapp";

void listStoredSessions().then((ids) => {
  for (const id of ids) void connect(id);
});

export default {
  port: Number(process.env.WA_GATEWAY_PORT) || 3002,
  hostname: process.env.WA_GATEWAY_HOST ?? "127.0.0.1",
  fetch: app.fetch,
};
