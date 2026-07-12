import { apiKeyClient } from "@better-auth/api-key/client";
import { useQuery } from "@tanstack/react-query";
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
  if (error) throw new Error(error.message ?? "falha na operação");
  return data as T;
}

export function safeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function redirectSearch(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect");
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
}

export function useCanManage(): boolean {
  const { data: session } = useSession();
  const { data: member } = useQuery({
    queryKey: ["active-member"],
    queryFn: () => unwrapAuth(organization.getActiveMember()),
    enabled: !!session,
  });
  return member?.role === "owner" || member?.role === "admin";
}
