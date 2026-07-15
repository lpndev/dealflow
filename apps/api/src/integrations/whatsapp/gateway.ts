import type {
  GatewayGroup,
  GatewayMessage,
  GatewaySession,
} from "@dealflow/shared";
import type {
  MessagingDestination,
  MessagingSession,
  SendMessageInput,
  SendMessageResult,
  WhatsAppGateway,
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

const base = (sessionId: string) =>
  `/sessions/${encodeURIComponent(sessionId)}`;

export const whatsappGateway: WhatsAppGateway = {
  async listGroups(sessionId: string): Promise<MessagingDestination[]> {
    const { groups } = await call<{ groups: GatewayGroup[] }>(
      `${base(sessionId)}/groups`,
    );
    return groups.map((g) => ({
      provider: "whatsapp",
      externalId: g.id,
      name: g.name,
    }));
  },

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    return call<SendMessageResult>(`${base(input.sessionId)}/messages`, {
      method: "POST",
      body: JSON.stringify({
        destinationExternalId: input.destinationExternalId,
        content: input.content,
        imageUrl: input.imageUrl,
      } satisfies GatewayMessage),
    });
  },

  async getSession(sessionId: string): Promise<MessagingSession> {
    const { connection, hasQr } = await call<GatewaySession>(base(sessionId));
    if (!hasQr) return { connection, qr: null };
    const { qr } = await call<{ qr: string }>(`${base(sessionId)}/qr`).catch(
      () => ({ qr: null as string | null }),
    );
    return { connection, qr };
  },

  async connect(sessionId: string): Promise<void> {
    await call(`${base(sessionId)}/connect`, { method: "POST" });
  },

  async end(sessionId: string): Promise<void> {
    await call(`${base(sessionId)}/end`, { method: "POST" });
  },

  async logout(sessionId: string): Promise<void> {
    await call(`${base(sessionId)}/logout`, { method: "POST" });
  },
};
