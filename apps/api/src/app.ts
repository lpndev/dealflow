import { Hono } from "hono";
import { cors } from "hono/cors";
import { deals } from "@/features/deals/import/route";
import { publications } from "@/features/publications/route";

export const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/deals", deals);
app.route("/publications", publications);

export default app;
