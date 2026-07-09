import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { PublicationError } from "@/shared/errors";
import {
  createPublication,
  previewPublication,
  type PublicationInput,
} from "./use-case";

export const publications = new Hono();

publications.post("/preview", async (c) => {
  const body = (await c.req
    .json()
    .catch(() => null)) as PublicationInput | null;
  return c.json(previewPublication(body ?? {}, getDb()));
});

publications.post("/", async (c) => {
  const body = (await c.req
    .json()
    .catch(() => null)) as PublicationInput | null;
  try {
    return c.json(createPublication(body ?? {}, getDb()), 201);
  } catch (err) {
    if (err instanceof PublicationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});
