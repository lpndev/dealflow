import app from "./app";
import { connect } from "./whatsapp";

void connect();

export default {
  port: 3002,
  fetch: app.fetch,
};
