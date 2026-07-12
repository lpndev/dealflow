import { expect, it } from "bun:test";
import app from "@/app";

async function post(body: unknown) {
  return app.request("/deals/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ponytail: route now requires a session (Task 3); no test harness yet mints
// an authenticated cookie (needs Task 6 onboarding). Behavior is covered at
// the use-case level (deals/import/use-case.test.ts, message.test.ts).
// Un-skip once a session-test helper exists.
it.skip("returns 400 when input is missing", async () => {
  const res = await post({});
  expect(res.status).toBe(400);
});

it.skip("returns 422 when the input has no supported url", async () => {
  const res = await post({ input: "sem link aqui" });
  expect(res.status).toBe(422);
});
