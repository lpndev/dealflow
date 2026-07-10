import { PauseIcon, PlayIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Empty, ErrorNote, Panel, QueueRow } from "@/components";
import { Button } from "@/components/ui/button";
import { usePolling } from "@/hooks";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib";
import { type QueueItem } from "@/types";

export function QueueTab(props: { refreshKey: number }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  function load() {
    if (busy.current) return;
    apiGet("/queue")
      .then((d) => {
        setItems(d.items ?? []);
        setPaused(!!d.paused);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }

  usePolling(load, 5000, props.refreshKey);

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    busy.current = true;
    try {
      await apiPost(next ? "/queue/pause" : "/queue/resume", {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao pausar");
    } finally {
      busy.current = false;
      load();
    }
  }

  async function reschedule(id: string, dueAt: string) {
    busy.current = true;
    try {
      await apiPut(`/queue/${id}/time`, { dueAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao reagendar");
    } finally {
      busy.current = false;
      load();
    }
  }

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

      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {paused
            ? "Fila pausada — nada será enviado até continuar."
            : "Fila ativa."}
        </span>
        <Button
          variant={paused ? "default" : "outline"}
          size="sm"
          onClick={togglePause}
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
                  ? (dueAt) => reschedule(it.id, dueAt)
                  : undefined
              }
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

  function load() {
    apiGet("/history")
      .then((d) => {
        setItems(d.items ?? []);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [props.refreshKey]);

  async function clear() {
    setItems([]);
    try {
      await apiDelete("/history");
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao limpar");
    } finally {
      load();
    }
  }

  return (
    <Panel title="Histórico" hint="Ofertas já enviadas">
      {error && <ErrorNote>{error}</ErrorNote>}
      {items.length === 0 ? (
        <Empty>Nada enviado ainda.</Empty>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={clear}>
              <TrashIcon />
              Limpar histórico
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <QueueRow key={it.id} item={it} when={it.sentAt} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
