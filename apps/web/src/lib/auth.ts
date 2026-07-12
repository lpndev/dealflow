import { apiKeyClient } from "@better-auth/api-key/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { API } from "./env";

export const authClient = createAuthClient({
  baseURL: API,
  plugins: [organizationClient(), apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut, organization } = authClient;

export async function unwrapAuth<T>(
  promise: Promise<{ data: T | null; error: { message?: string } | null }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error || data == null)
    throw new Error(error?.message ?? "falha na operação");
  return data;
}
