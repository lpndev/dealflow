import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Empty, ErrorNote, GroupToggle, Panel } from "@/components"
import { apiGet, apiPatch } from "@/lib"
import { type Destination } from "@/types"

type DestData = { destinations: Destination[] }

export function GroupsConfig() {
  const qc = useQueryClient()
  const { data, error } = useQuery<DestData>({
    queryKey: ["destinations"],
    queryFn: () => apiGet("/destinations")
  })
  const groups = data?.destinations ?? []

  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) =>
      apiPatch(`/destinations/${v.id}`, { enabled: v.enabled }),
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: ["destinations"] })
      const prev = qc.getQueryData<DestData>(["destinations"])
      qc.setQueryData<DestData>(["destinations"], (o) =>
        o
          ? {
              ...o,
              destinations: o.destinations.map((g) =>
                g.id === id ? { ...g, enabled } : g
              )
            }
          : o
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["destinations"], ctx.prev)
    },
    onSuccess: (d) => qc.setQueryData(["destinations"], d)
  })

  return (
    <Panel
      title="Grupos padrão"
      hint="Os ativos já vêm marcados ao enviar uma oferta"
    >
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {groups.length === 0 ? (
        <Empty>Nenhum grupo ainda. Conecte o WhatsApp e sincronize.</Empty>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <GroupToggle
              key={g.id}
              name={g.name}
              checked={g.enabled}
              onCheckedChange={(checked) =>
                toggle.mutate({ id: g.id, enabled: checked })
              }
            />
          ))}
        </ul>
      )}
    </Panel>
  )
}
