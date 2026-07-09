import { fmtTime } from "@/lib";
import { type QueueItem } from "@/types";
import { IconButton } from "@/ui";

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

export function QueueRow(props: {
  item: QueueItem;
  when: string | null;
  controls?: Controls;
}) {
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
          className="h-10 w-10 shrink-0 rounded bg-panel object-contain"
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
