import { Button } from "@dealflow/ui/button"
import { TrashIcon } from "@phosphor-icons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Empty, ErrorNote, Panel, QueueRow } from "@/components"
import { apiDelete, apiGet, errMsg } from "@/lib"
import { type QueueItem } from "@/types"

type HistoryData = { items: QueueItem[] }

export function HistoryTab() {
  const qc = useQueryClient()

  const { data, error } = useQuery<HistoryData>({
    queryKey: ["history"],
    queryFn: () => apiGet("/history")
  })
  const items = data?.items ?? []

  const clear = useMutation({
    mutationFn: () => apiDelete("/history"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["history"] })
      const prev = qc.getQueryData<HistoryData>(["history"])
      qc.setQueryData<HistoryData>(["history"], { items: [] })
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["history"], ctx.prev)
      toast.error(errMsg(e, "falha ao limpar"))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["history"] })
  })

  return (
    <Panel title="Histórico">
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {items.length === 0 ? (
        <Empty>Nada enviado ainda.</Empty>
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clear.mutate()}
            >
              <TrashIcon />
              Limpar histórico
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <QueueRow
                key={it.id}
                item={it}
                when={it.sentAt}
              />
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}
