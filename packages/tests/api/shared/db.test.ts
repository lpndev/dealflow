import { expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/shared/db";

it("uses an in-memory database in tests", () => {
  expect(resolveDatabaseUrl({ NODE_ENV: "test" })).toBe(":memory:");
});

it("keeps an explicit database override", () => {
  expect(
    resolveDatabaseUrl({ NODE_ENV: "test", DATABASE_URL: "/tmp/custom.db" }),
  ).toBe("/tmp/custom.db");
});

it("resolves the default independently from the process cwd", () => {
  expect(
    resolveDatabaseUrl({ NODE_ENV: "production" }).endsWith(
      "/apps/api/dealflow.db",
    ),
  ).toBe(true);
});
