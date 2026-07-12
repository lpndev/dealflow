import { API, API_DOWN, GATEWAY } from "./env";

async function request(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { credentials: "include", ...init });
  } catch {
    throw new Error(API_DOWN);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "A operação falhou.");
  return data;
}

export const apiGet = (path: string) => request(path);

export const apiPost = (path: string, body: unknown) =>
  request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiPut = (path: string, body: unknown) =>
  request(path, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiPatch = (path: string, body: unknown) =>
  request(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiDelete = (path: string) => request(path, { method: "DELETE" });

export const gatewayPost = (path: string) =>
  fetch(`${GATEWAY}${path}`, { method: "POST" }).then((r) => r.json());

export async function fetchSession(): Promise<{
  connection: string;
  qr: string | null;
}> {
  try {
    const session = await fetch(`${GATEWAY}/session`).then((r) => r.json());
    const qr = session.hasQr
      ? ((await fetch(`${GATEWAY}/session/qr`).then((r) => r.json())).qr ??
        null)
      : null;
    return { connection: session.connection, qr };
  } catch {
    return { connection: "gateway offline", qr: null };
  }
}
