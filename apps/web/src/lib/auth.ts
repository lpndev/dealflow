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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

export async function createWorkspace(name: string) {
  const baseSlug = slugify(name) || "workspace";
  let res = await organization.create({ name, slug: baseSlug });
  if (res.error?.code === "ORGANIZATION_SLUG_ALREADY_TAKEN") {
    const suffix = crypto.randomUUID().slice(0, 5);
    res = await organization.create({ name, slug: `${baseSlug}-${suffix}` });
  }
  if (res.error?.code === "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION") {
    throw new Error(
      "Seu plano não permite criar mais workspaces. Faça upgrade para adicionar outro.",
    );
  }
  if (res.error || !res.data) {
    throw new Error(res.error?.message ?? "Falha ao criar workspace.");
  }
  await unwrapAuth(organization.setActive({ organizationId: res.data.id }));
  return res.data;
}

export function safeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function redirectSearch(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect");
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
}

export function useOrganizations() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => (await organization.list()).data ?? [],
    enabled: !!session,
  });
}

export function useActiveRole(): string | null {
  const { data: session } = useSession();
  const { data: member } = useQuery({
    queryKey: ["active-member"],
    queryFn: () => unwrapAuth(organization.getActiveMember()),
    enabled: !!session,
  });
  return member?.role ?? null;
}

export function useCanManage(): boolean {
  const role = useActiveRole();
  return role === "owner" || role === "admin";
}
