import { Hono } from "hono";
import { cors } from "hono/cors";
import { dashboard } from "@/features/dashboard/route";
import { capture } from "@/features/deals/capture/route";
import { deals } from "@/features/deals/import/route";
import { destinations } from "@/features/destinations/route";
import { publications } from "@/features/publications/route";
import { schedule } from "@/features/publications/schedule/route";
import { send } from "@/features/publications/send/route";
import { queue } from "@/features/queue/route";
import { settingsRoutes } from "@/features/settings/route";
import { auth, type AppEnv } from "@/shared/auth";

export const app = new Hono<AppEnv>();

app.use(
  "/*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowHeaders: ["content-type", "x-api-key"],
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/deals", deals);
app.route("/deals", capture);
app.route("/publications", publications);
app.route("/publications", send);
app.route("/publications", schedule);
app.route("/destinations", destinations);
app.route("/settings", settingsRoutes);
app.route("/", queue);
app.route("/", dashboard);

export default app;
