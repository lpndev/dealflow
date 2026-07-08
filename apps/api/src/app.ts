import { Hono } from "hono";
import { cors } from "hono/cors";
import { deals } from "@/features/deals/import/route";
import { publications } from "@/features/publications/route";
import { send } from "@/features/publications/send/route";
import { destinations } from "@/features/destinations/route";

export const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/deals", deals);
app.route("/publications", publications);
app.route("/publications", send);
app.route("/destinations", destinations);

export default app;
