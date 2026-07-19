import { API, API_DOWN } from "./env";

function errorMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const { error } = data as { error?: unknown };
    if (typeof error === "string") return error;
  }
  return "A operação falhou.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { credentials: "include", ...init });
  } catch {
    throw new Error(API_DOWN);
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const apiGet = <T = unknown>(path: string) => request<T>(path);

export const apiPost = <T = unknown>(path: string, body: unknown) =>
  request<T>(path, json("POST", body));

export const apiPut = <T = unknown>(path: string, body: unknown) =>
  request<T>(path, json("PUT", body));

export const apiPatch = <T = unknown>(path: string, body: unknown) =>
  request<T>(path, json("PATCH", body));

export const apiDelete = <T = unknown>(path: string) =>
  request<T>(path, { method: "DELETE" });
