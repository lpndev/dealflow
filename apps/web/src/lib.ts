export const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
export const GATEWAY =
  import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:3002";

export const API_DOWN = "A API não respondeu. Confira se ela está rodando.";

export const plural = (n: number) => (n === 1 ? "" : "s");

export function fmtTime(value: string | number | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const fmtMin = (seconds: number) => `${Math.round(seconds / 60)} min`;

async function request(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, init);
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
