import app from "./app";
import { connect } from "./whatsapp";

void connect();

export default {
  port: 3002,
  hostname: "127.0.0.1",
  fetch: app.fetch,
};
