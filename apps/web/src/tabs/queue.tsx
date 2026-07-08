import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut, apiDelete, fmtTime } from "../lib";
import { Panel, Empty, ErrorNote } from "../ui";

type Item = {
  id: string;
  title: string | null;
  imageUrl: string | null;
  destinationName: string;
  status: string;
  dueAt: string | null;
  sentAt: string | null;
  error: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "agendado", cls: "text-gold" },
  processing: { label: "enviando…", cls: "text-gold" },
  sent: { label: "enviado", cls: "text-go" },
  failed: { label: "falhou", cls: "text-fail" },
};

type Controls = {
  onUp?: () => void;
  onDown?: () => void;
  onCancel: () => void;
};

function Row(props: { item: Item; when: string | null; controls?: Controls }) {
  const s = STATUS[props.item.status] ?? {
    label: props.item.status,
    cls: "text-muted",
  };
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-inset px-3 py-2.5">
      {props.item.imageUrl && (
        <img
          src={props.item.imageUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded object-contain bg-panel"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">
          {props.item.title ?? "sem título"}
        </p>
        <p className="truncate text-xs text-muted">
          {props.item.destinationName}
          {props.item.error && (
            <span className="text-fail"> — {props.item.error}</span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-mono text-xs ${s.cls}`}>{s.label}</p>
        <p className="font-mono text-xs text-muted">{fmtTime(props.when)}</p>
      </div>
      {props.controls && (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Subir na fila"
            disabled={!props.controls.onUp}
            onClick={props.controls.onUp}
          >
            ↑
          </IconButton>
          <IconButton
            label="Descer na fila"
            disabled={!props.controls.onDown}
            onClick={props.controls.onDown}
          >
            ↓
          </IconButton>
          <IconButton
            label="Cancelar envio"
            onClick={props.controls.onCancel}
            danger
          >
            ✕
          </IconButton>
        </div>
      )}
    </li>
  );
}

function IconButton(props: {
  label: string;
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`grid h-7 w-7 place-items-center rounded border border-line text-sm transition hover:border-muted disabled:opacity-30 ${
        props.danger ? "text-fail hover:border-fail" : "text-muted"
      }`}
    >
      {props.children}
    </button>
  );
}

export function QueueTab(props: { refreshKey: number }) {
  const [items, setItems] = useState<Item[]>([]);
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

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [props.refreshKey]);

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
            <Row
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
  const [items, setItems] = useState<Item[]>([]);
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
            <Row key={it.id} item={it} when={it.sentAt} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
