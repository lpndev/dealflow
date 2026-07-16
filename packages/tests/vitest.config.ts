import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const support = { "@support": r("./support") };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { "@": r("../../apps/api/src"), ...support } },
        test: {
          name: "api",
          environment: "node",
          include: ["api/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: { "@": r("../../apps/wa-gateway/src") } },
        test: {
          name: "wa-gateway",
          environment: "node",
          include: ["wa-gateway/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: { "@extension": r("../../apps/extension") } },
        test: {
          name: "extension",
          environment: "node",
          include: ["extension/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: { "@": r("../../apps/web/src") } },
        test: {
          name: "web",
          environment: "node",
          include: ["web/**/*.test.ts"],
        },
      },
    ],
  },
});
