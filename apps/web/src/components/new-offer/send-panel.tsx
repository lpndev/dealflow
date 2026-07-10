import {
  ArrowsClockwiseIcon,
  CalendarDotsIcon,
  CheckIcon,
  PaperPlaneTiltIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Empty, GroupToggle, Panel } from "@/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { plural } from "@/lib";
import { type DeliveryResult, type Destination } from "@/types";

export function SendPanel(props: {
  destinations: Destination[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSync: () => void;
  onSendNow: () => void;
  onSchedule: () => void;
  startAt: string;
  onStartAt: (value: string) => void;
  results: DeliveryResult[] | null;
}) {
  const nameOf = (id: string) =>
    props.destinations.find((d) => d.id === id)?.name ?? id;

  const [scheduling, setScheduling] = useState(false);
  const clearSchedule = () => {
    props.onStartAt("");
    setScheduling(false);
  };

  return (
    <Panel
      title="Enviar"
      eyebrow="03"
      hint="Agende para espaçar, ou envie agora."
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {props.selected.size > 0
            ? `${props.selected.size} grupo${plural(props.selected.size)} selecionado${plural(props.selected.size)}`
            : "Escolha os grupos"}
        </span>
        <Button variant="ghost" size="sm" onClick={props.onSync}>
          <ArrowsClockwiseIcon />
          Sincronizar grupos
        </Button>
      </div>

      {props.destinations.length === 0 ? (
        <Empty>Nenhum grupo ainda. Conecte o WhatsApp e sincronize.</Empty>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {props.destinations.map((d) => (
            <GroupToggle
              key={d.id}
              name={d.name}
              checked={props.selected.has(d.id)}
              onCheckedChange={() => props.onToggle(d.id)}
            />
          ))}
        </ul>
      )}

      {scheduling ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Começar em</span>
          <Input
            type="datetime-local"
            value={props.startAt}
            onChange={(e) => props.onStartAt(e.target.value)}
            className="w-auto"
          />
          <button
            onClick={clearSchedule}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            enviar agora
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setScheduling(true)}
          className="self-start"
        >
          <CalendarDotsIcon />
          Agendar para outro horário
        </Button>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          onClick={props.onSchedule}
          disabled={props.selected.size === 0}
        >
          <CalendarDotsIcon />
          Agendar envio
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={props.onSendNow}
          disabled={props.selected.size === 0}
        >
          <PaperPlaneTiltIcon />
          Enviar agora
        </Button>
      </div>

      {props.results && (
        <ul className="flex flex-col gap-2 border-t pt-4 font-mono text-xs">
          {props.results.map((r) => (
            <li key={r.destinationId} className="flex items-center gap-2">
              {r.status === "sent" ? (
                <CheckIcon className="size-4 text-emerald-500" />
              ) : (
                <XIcon className="size-4 text-destructive" />
              )}
              <span className="text-foreground">{nameOf(r.destinationId)}</span>
              {r.error && (
                <span className="text-muted-foreground">— {r.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
