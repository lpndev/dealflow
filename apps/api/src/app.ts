import { Hono } from "hono";
import { cors } from "hono/cors";
import { capture } from "@/features/deals/capture/route";
import { deals } from "@/features/deals/import/route";
import { destinations } from "@/features/destinations/route";
import { publications } from "@/features/publications/route";
import { schedule } from "@/features/publications/schedule/route";
import { send } from "@/features/publications/send/route";
import { queue } from "@/features/queue/route";
import { settingsRoutes } from "@/features/settings/route";

export const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/deals", deals);
app.route("/deals", capture);
app.route("/publications", publications);
app.route("/publications", send);
app.route("/publications", schedule);
app.route("/destinations", destinations);
app.route("/settings", settingsRoutes);
app.route("/", queue);

export default app;
