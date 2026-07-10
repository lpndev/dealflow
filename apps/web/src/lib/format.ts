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

const CONNECTION_LABEL: Record<string, string> = {
  open: "conectado",
  connecting: "conectando…",
  close: "desconectado",
  desconhecido: "verificando…",
  "gateway offline": "gateway offline",
};

export const connectionLabel = (connection: string) =>
  CONNECTION_LABEL[connection] ?? connection;
