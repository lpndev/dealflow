import { type DashboardData, type DashboardRange } from "@dealflow/shared"
import { Card, CardContent } from "@dealflow/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@dealflow/ui/toggle-group"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { DashboardChart, ErrorNote, Panel } from "@/components"
import { apiGet } from "@/lib"

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" }
]

function Stat(props: Readonly<{ label: string; value: number }>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{props.label}</span>
        <span className="text-2xl font-bold tabular-nums">{props.value}</span>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const [range, setRange] = useState<DashboardRange>("week")

  const { data, error } = useQuery<DashboardData>({
    queryKey: ["dashboard", range],
    queryFn: () => apiGet(`/dashboard?range=${range}`),
    refetchInterval: 10000
  })

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorNote>{error.message}</ErrorNote>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Enviados no período"
          value={data?.sent ?? 0}
        />
        <Stat
          label="Pendentes na fila"
          value={data?.pending ?? 0}
        />
        <Stat
          label="Grupos ativos"
          value={data?.groups ?? 0}
        />
        <Stat
          label="Falhas no período"
          value={data?.failed ?? 0}
        />
      </div>

      <Panel title="Envios">
        <ToggleGroup
          value={[range]}
          onValueChange={(v: string[]) => {
            if (v[0]) setRange(v[0] as DashboardRange)
          }}
          variant="outline"
          size="sm"
          className="self-start"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r.value}
              value={r.value}
            >
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <DashboardChart data={data?.series ?? []} />
      </Panel>
    </div>
  )
}
