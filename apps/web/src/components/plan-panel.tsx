import { Badge } from "@dealflow/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGet, plural } from "@/lib";
import { type PlanStatus } from "@/types";
import { Panel } from "./panel";

function Usage({
  label,
  used,
  limit,
}: Readonly<{
  label: string;
  used: number;
  limit: number | null;
}>) {
  const pct = limit === null ? 0 : Math.min(100, (used / limit) * 100);
  const over = limit !== null && used >= limit;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {used}
          {limit === null ? "" : ` / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={over ? "h-full bg-destructive" : "h-full bg-primary"}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function trialText(status: PlanStatus): string | null {
  if (status.selfHost || status.planId !== "free") return null;
  if (status.trialExpired)
    return "Seu teste terminou — assine um plano para continuar enviando.";
  if (!status.trialEndsAt) return null;
  const days = Math.max(
    0,
    Math.ceil(
      (new Date(status.trialEndsAt).getTime() - Date.now()) / 86_400_000,
    ),
  );
  return `Teste grátis: ${days} dia${plural(days)} restante${plural(days)}.`;
}

export function PlanPanel() {
  const { data } = useQuery<PlanStatus>({
    queryKey: ["plan"],
    queryFn: () => apiGet("/plan"),
  });
  if (!data || data.selfHost) return null;

  const trial = trialText(data);
  const rows = [
    ["Envios no mês", data.usage.sendsThisMonth, data.limits.sendsPerMonth],
    ["Grupos ativos", data.usage.destinations, data.limits.destinations],
    ["Membros", data.usage.members, data.limits.members],
    ["Workspaces", data.usage.workspaces, data.limits.workspaces],
  ] as const;

  return (
    <Panel
      title={`Plano ${data.name}`}
      eyebrow={data.planId}
      hint="Seu plano define os limites de envios, grupos, membros e workspaces — somados em todos os seus workspaces."
    >
      {trial && (
        <Badge variant={data.trialExpired ? "destructive" : "secondary"}>
          {trial}
        </Badge>
      )}
      <div className="flex flex-col gap-3">
        {rows.map(([label, used, limit]) => (
          <Usage key={label} label={label} used={used} limit={limit} />
        ))}
      </div>
    </Panel>
  );
}
