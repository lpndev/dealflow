import { useEffect, useState } from "react";
import { apiGet, fmtTime } from "../lib";
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

function Row(props: { item: Item; when: string | null }) {
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
    </li>
  );
}

export function QueueTab(props: { refreshKey: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      apiGet("/queue")
        .then((d) => {
          setItems(d.items ?? []);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [props.refreshKey]);

  return (
    <Panel title="Fila" hint="Próximos envios, espaçados para parecer humano">
      {error && <ErrorNote>{error}</ErrorNote>}
      {items.length === 0 ? (
        <Empty>Nada na fila. Agende uma oferta na aba Nova oferta.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <Row key={it.id} item={it} when={it.dueAt} />
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
