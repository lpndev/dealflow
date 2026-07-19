import type { DashboardRange } from "@dealflow/shared";
import { Hono } from "hono";
import { requireAuth, type AppEnv } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { getDashboard } from "./use-case";

const RANGES = new Set<string>(["day", "week", "month", "year"]);

export const dashboard = new Hono<AppEnv>();

dashboard.use("*", requireAuth);

dashboard.get("/dashboard", (c) => {
  const q = c.req.query("range");
  const range: DashboardRange =
    q !== undefined && RANGES.has(q) ? (q as DashboardRange) : "week";
  return c.json(getDashboard(getDb(), c.get("workspaceId"), range));
});
