import app from "./app";
import { connect, listStoredSessions } from "./whatsapp";

void listStoredSessions().then((ids) => {
  for (const id of ids) void connect(id);
});

export default {
  port: 3002,
  hostname: "127.0.0.1",
  fetch: app.fetch,
};
