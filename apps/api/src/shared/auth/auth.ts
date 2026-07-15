import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { getDb } from "@/shared/db";
import * as schema from "@/shared/schema";
import { hierarchyGuard } from "./hierarchy";
import { ac, admin, member, owner } from "./permissions";
import { trustedOrigins } from "./trusted-origins";
import { resolveActiveWorkspace } from "./workspace-claim";

if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required in production");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  trustedOrigins,
  rateLimit: { enabled: true, window: 60, max: 10 },
  database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  user: { deleteUser: { enabled: true } },
  hooks: { before: hierarchyGuard },
  plugins: [
    organization({
      ac,
      roles: { owner, admin, member },
    }),
    apiKey({ enableSessionForAPIKeys: false, enableMetadata: true }),
  ],
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const activeOrganizationId = resolveActiveWorkspace(
            getDb(),
            session.userId,
          );
          return {
            data: { ...session, activeOrganizationId },
          };
        },
      },
    },
  },
});
