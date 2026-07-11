import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getDb } from "@/shared/db";
import * as schema from "@/shared/schema";
import { ac, admin, member, owner } from "./permissions";

const LEGACY_WORKSPACE_ID = "default";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  trustedOrigins: ["http://localhost:5173"],
  database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  plugins: [
    organization({
      ac,
      roles: { owner, admin, member },
    }),
    apiKey({ enableSessionForAPIKeys: true, enableMetadata: true }),
  ],
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          // ponytail: first signup claims the pre-existing "default" workspace
          // (holds the operator's migrated data); single-operator local, not
          // concurrency-safe. Later signups create/join via onboarding/invite.
          const db = getDb();
          const legacy = db
            .select()
            .from(schema.organization)
            .where(eq(schema.organization.id, LEGACY_WORKSPACE_ID))
            .get();
          if (!legacy) return;
          const claimed = db
            .select()
            .from(schema.member)
            .where(eq(schema.member.organizationId, LEGACY_WORKSPACE_ID))
            .get();
          if (claimed) return;
          db.insert(schema.member)
            .values({
              id: crypto.randomUUID(),
              organizationId: LEGACY_WORKSPACE_ID,
              userId: user.id,
              role: "owner",
              createdAt: new Date(),
            })
            .run();
        },
      },
    },
    session: {
      create: {
        async before(session) {
          const db = getDb();
          const membership = db
            .select()
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .get();
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
});
