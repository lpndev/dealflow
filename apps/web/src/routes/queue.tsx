import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Empty, ErrorNote, Panel, QueueRow } from "@/components";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPost, apiPut, errMsg } from "@/lib";
import { type QueueItem } from "@/types";

type QueueData = { items: QueueItem[]; paused: boolean };

export function QueueTab() {
  const qc = useQueryClient();

  const { data, error } = useQuery<QueueData>({
    queryKey: ["queue"],
    queryFn: () => apiGet("/queue"),
    refetchInterval: 5000,
  });
  const items = data?.items ?? [];
  const paused = !!data?.paused;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["queue"] });
  const fail = (msg: string) => (e: unknown) => toast.error(errMsg(e, msg));

  const pause = useMutation({
    mutationFn: (next: boolean) =>
      apiPost(next ? "/queue/pause" : "/queue/resume", {}),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["queue"] });
      const prev = qc.getQueryData<QueueData>(["queue"]);
      qc.setQueryData<QueueData>(["queue"], (o) =>
        o ? { ...o, paused: next } : o,
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["queue"], ctx.prev);
      fail("falha ao pausar")(e);
    },
    onSettled: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiPut("/queue/order", { orderedIds }),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["queue"] });
      const prev = qc.getQueryData<QueueData>(["queue"]);
      qc.setQueryData<QueueData>(["queue"], (o) => {
        if (!o) return o;
        const byId = new Map(o.items.map((i) => [i.id, i]));
        return {
          ...o,
          items: orderedIds
            .map((id) => byId.get(id))
            .filter((i): i is QueueItem => !!i),
        };
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["queue"], ctx.prev);
      fail("falha ao reordenar")(e);
    },
    onSettled: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiDelete(`/queue/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["queue"] });
      const prev = qc.getQueryData<QueueData>(["queue"]);
      qc.setQueryData<QueueData>(["queue"], (o) =>
        o ? { ...o, items: o.items.filter((i) => i.id !== id) } : o,
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["queue"], ctx.prev);
      fail("falha ao cancelar")(e);
    },
    onSettled: invalidate,
  });

  const reschedule = useMutation({
    mutationFn: (v: { id: string; dueAt: string }) =>
      apiPut(`/queue/${v.id}/time`, { dueAt: v.dueAt }),
    onError: fail("falha ao reagendar"),
    onSettled: invalidate,
  });

  function move(from: number, to: number) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder.mutate(next.map((i) => i.id));
  }

  return (
    <Panel title="Fila" hint="Próximos envios, espaçados para parecer humano">
      {error && <ErrorNote>{error.message}</ErrorNote>}

      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {paused
            ? "Fila pausada — nada será enviado até continuar."
            : "Fila ativa."}
        </span>
        <Button
          variant={paused ? "default" : "outline"}
          size="sm"
          onClick={() => pause.mutate(!paused)}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? "Continuar fila" : "Pausar fila"}
        </Button>
      </div>

      {items.length === 0 ? (
        <Empty>Nada na fila. Agende uma oferta na aba Nova oferta.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it, i) => (
            <QueueRow
              key={it.id}
              item={it}
              when={it.dueAt}
              onReschedule={
                it.status === "scheduled"
                  ? (dueAt) => reschedule.mutate({ id: it.id, dueAt })
                  : undefined
              }
              controls={
                it.status === "scheduled"
                  ? {
                      onUp: i > 0 ? () => move(i, i - 1) : undefined,
                      onDown:
                        i < items.length - 1 ? () => move(i, i + 1) : undefined,
                      onCancel: () => cancel.mutate(it.id),
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
