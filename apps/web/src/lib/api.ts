import { API, API_DOWN } from "./env";

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

export const apiDelete = (path: string) => request(path, { method: "DELETE" });
