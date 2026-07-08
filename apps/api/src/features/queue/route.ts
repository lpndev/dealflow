import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { listQueue, listHistory } from "./use-case";

export const queue = new Hono();

queue.get("/queue", (c) => c.json({ items: listQueue(getDb()) }));

queue.get("/history", (c) => c.json({ items: listHistory(getDb()) }));
