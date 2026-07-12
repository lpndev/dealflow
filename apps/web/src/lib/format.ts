import { toast } from "sonner";

export const plural = (n: number) => (n === 1 ? "" : "s");

export const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Publisher",
};

const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, member: 1 };

export const roleRank = (role: string | null | undefined): number =>
  (role ? ROLE_RANK[role] : 0) ?? 0;

export function copyWithToast(text: string, message: string) {
  navigator.clipboard.writeText(text);
  toast.success(message);
}

export const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

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
