import { Hono } from "hono";
import { requireAuth, type AppEnv } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { PublicationError } from "@/shared/errors";
import {
  createPublication,
  previewPublication,
  type PublicationInput,
} from "./use-case";

export const publications = new Hono<AppEnv>();

publications.use("*", requireAuth);

publications.post("/preview", async (c) => {
  const body = (await c.req
    .json()
    .catch(() => null)) as PublicationInput | null;
  return c.json(previewPublication(body ?? {}, getDb(), c.get("workspaceId")));
});

publications.post("/", async (c) => {
  const body = (await c.req
    .json()
    .catch(() => null)) as PublicationInput | null;
  try {
    return c.json(
      createPublication(body ?? {}, getDb(), c.get("workspaceId")),
      201,
    );
  } catch (err) {
    if (err instanceof PublicationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});
