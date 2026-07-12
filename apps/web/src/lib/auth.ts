import { apiKeyClient } from "@better-auth/api-key/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { API } from "./env";

export const authClient = createAuthClient({
  baseURL: API,
  plugins: [organizationClient(), apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut, organization } = authClient;
