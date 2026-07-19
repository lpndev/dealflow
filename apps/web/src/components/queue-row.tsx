import { Button } from "@dealflow/ui/button";
import { Input } from "@dealflow/ui/input";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { fmtTime } from "@/lib";
import { type QueueItem } from "@/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "agendado", cls: "text-primary" },
  processing: { label: "enviando…", cls: "text-primary" },
  sent: { label: "enviado", cls: "text-emerald-500" },
  failed: { label: "falhou", cls: "text-destructive" },
};

type Controls = {
  onUp?: () => void;
  onDown?: () => void;
  onCancel: () => void;
};

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function QueueRow(
  props: Readonly<{
    item: QueueItem;
    when: string | null;
    controls?: Controls;
    onReschedule?: (dueAt: string) => void;
  }>,
) {
  const [editing, setEditing] = useState(false);
  const s = STATUS[props.item.status] ?? {
    label: props.item.status,
    cls: "text-muted-foreground",
  };
  return (
    <li className="flex items-center gap-4 border bg-card px-4 py-2">
      {props.item.imageUrl && (
        <img
          src={props.item.imageUrl}
          alt=""
          className="h-10 w-10 shrink-0 bg-muted object-contain"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-xs text-foreground">
          {props.item.title ?? "sem título"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {props.item.destinationName}
          {props.item.error && (
            <span className="text-destructive"> — {props.item.error}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className={`font-mono text-xs ${s.cls}`}>{s.label}</p>
        {editing && props.onReschedule ? (
          <Input
            type="datetime-local"
            autoFocus
            defaultValue={toLocalInput(props.when)}
            onBlur={() => setEditing(false)}
            onChange={(e) => {
              if (!e.target.value) return;
              props.onReschedule?.(new Date(e.target.value).toISOString());
              setEditing(false);
            }}
            className="w-auto font-mono"
          />
        ) : (
          <p className="font-mono text-xs text-muted-foreground">
            {fmtTime(props.when)}
          </p>
        )}
      </div>
      {props.controls && (
        <div className="flex shrink-0 items-center gap-1">
          {props.onReschedule && (
            <Button
              variant="outline"
              size="icon"
              title="Editar horário"
              aria-label="Editar horário"
              onClick={() => setEditing(true)}
            >
              <ClockIcon />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            title="Subir na fila"
            aria-label="Subir na fila"
            disabled={!props.controls.onUp}
            onClick={props.controls.onUp}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Descer na fila"
            aria-label="Descer na fila"
            disabled={!props.controls.onDown}
            onClick={props.controls.onDown}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Cancelar envio"
            aria-label="Cancelar envio"
            className="text-destructive hover:text-destructive"
            onClick={props.controls.onCancel}
          >
            <XIcon />
          </Button>
        </div>
      )}
    </li>
  );
}
