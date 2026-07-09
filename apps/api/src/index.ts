import { startScheduler } from "@/features/publications/schedule/scheduler";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { getDb } from "@/shared/db";
import app from "./app";

startScheduler(getDb(), whatsappGateway);

export default {
  port: 3001,
  hostname: "127.0.0.1",
  fetch: app.fetch,
};
