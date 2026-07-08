import { Hono } from "hono";
import { cors } from "hono/cors";
import { deals } from "@/features/deals/import/route";
import { publications } from "@/features/publications/route";
import { send } from "@/features/publications/send/route";
import { schedule } from "@/features/publications/schedule/route";
import { destinations } from "@/features/destinations/route";
import { settingsRoutes } from "@/features/settings/route";
import { queue } from "@/features/queue/route";

export const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/deals", deals);
app.route("/publications", publications);
app.route("/publications", send);
app.route("/publications", schedule);
app.route("/destinations", destinations);
app.route("/settings", settingsRoutes);
app.route("/", queue);

export default app;
