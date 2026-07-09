import type {
  MessagingDestination,
  MessagingProvider,
  SendMessageInput,
  SendMessageResult,
} from "@/shared/messaging";

const GATEWAY_URL = process.env.WA_GATEWAY_URL ?? "http://localhost:3002";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`wa-gateway ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const whatsappGateway: MessagingProvider = {
  async listGroups(): Promise<MessagingDestination[]> {
    const { groups } = await call<{
      groups: { id: string; name: string }[];
    }>("/groups");
    return groups.map((g) => ({
      provider: "whatsapp",
      externalId: g.id,
      name: g.name,
    }));
  },

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    return call<SendMessageResult>("/messages", {
      method: "POST",
      body: JSON.stringify({
        to: input.destinationExternalId,
        content: input.content,
        imageUrl: input.imageUrl,
      }),
    });
  },
};
