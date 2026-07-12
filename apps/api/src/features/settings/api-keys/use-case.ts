import { auth } from "@/shared/auth";

export async function createWorkspaceApiKey(
  headers: Headers,
  workspaceId: string,
  name: string,
) {
  return auth.api.createApiKey({
    headers,
    body: { name, metadata: { organizationId: workspaceId } },
  });
}

function parseMetadata(metadata: unknown): { organizationId?: string } | null {
  try {
    return typeof metadata === "string"
      ? JSON.parse(metadata)
      : (metadata ?? null);
  } catch {
    return null;
  }
}

export async function listWorkspaceApiKeys(
  headers: Headers,
  workspaceId: string,
) {
  const { apiKeys } = await auth.api.listApiKeys({ headers });
  return apiKeys.filter(
    (k) => parseMetadata(k.metadata)?.organizationId === workspaceId,
  );
}

export async function deleteWorkspaceApiKey(
  headers: Headers,
  workspaceId: string,
  keyId: string,
) {
  const mine = await listWorkspaceApiKeys(headers, workspaceId);
  if (!mine.some((k) => k.id === keyId)) return false;
  await auth.api.deleteApiKey({ headers, body: { keyId } });
  return true;
}
