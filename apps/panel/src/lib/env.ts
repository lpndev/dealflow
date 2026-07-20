const apiUrl: unknown = import.meta.env.VITE_API_URL

export const API =
  typeof apiUrl === "string" && apiUrl ? apiUrl : "http://localhost:3001"

export const API_DOWN = "A API não respondeu. Confira se ela está rodando."
