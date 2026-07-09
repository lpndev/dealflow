import { useEffect, useRef, useState } from "react";
import { QueueRow } from "@/components";
import { usePolling } from "@/hooks";
import { apiDelete, apiGet, apiPut } from "@/lib";
import { type QueueItem } from "@/types";
import { Empty, ErrorNote, Panel } from "@/ui";

export function QueueTab(props: { refreshKey: number }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  function load() {
    if (busy.current) return;
    apiGet("/queue")
      .then((d) => {
        setItems(d.items ?? []);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }

  usePolling(load, 5000, props.refreshKey);

  async function reorder(from: number, to: number) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    busy.current = true;
    try {
      await apiPut("/queue/order", { orderedIds: next.map((i) => i.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao reordenar");
    } finally {
      busy.current = false;
      load();
    }
  }

  async function cancel(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    busy.current = true;
    try {
      await apiDelete(`/queue/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao cancelar");
    } finally {
      busy.current = false;
      load();
    }
  }

  return (
    <Panel title="Fila" hint="Próximos envios, espaçados para parecer humano">
      {error && <ErrorNote>{error}</ErrorNote>}
      {items.length === 0 ? (
        <Empty>Nada na fila. Agende uma oferta na aba Nova oferta.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <QueueRow
              key={it.id}
              item={it}
              when={it.dueAt}
              controls={
                it.status === "scheduled"
                  ? {
                      onUp: i > 0 ? () => reorder(i, i - 1) : undefined,
                      onDown:
                        i < items.length - 1
                          ? () => reorder(i, i + 1)
                          : undefined,
                      onCancel: () => cancel(it.id),
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

export function HistoryTab(props: { refreshKey: number }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/history")
      .then((d) => {
        setItems(d.items ?? []);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [props.refreshKey]);

  return (
    <Panel title="Histórico" hint="Ofertas já enviadas">
      {error && <ErrorNote>{error}</ErrorNote>}
      {items.length === 0 ? (
        <Empty>Nada enviado ainda.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <QueueRow key={it.id} item={it} when={it.sentAt} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
