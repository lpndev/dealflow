import app from "./app";
import { getDb } from "@/shared/db";
import { startScheduler } from "@/features/publications/schedule/scheduler";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";

startScheduler(getDb(), whatsappGateway);

export default {
  port: 3001,
  hostname: "127.0.0.1",
  fetch: app.fetch,
};
