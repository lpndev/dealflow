import type { DashboardRange } from "@dealflow/shared";
import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { getDashboard } from "./use-case";

const RANGES: DashboardRange[] = ["day", "week", "month", "year"];

export const dashboard = new Hono();

dashboard.get("/dashboard", (c) => {
  const q = c.req.query("range");
  const range = RANGES.includes(q as DashboardRange)
    ? (q as DashboardRange)
    : "week";
  return c.json(getDashboard(getDb(), range));
});
