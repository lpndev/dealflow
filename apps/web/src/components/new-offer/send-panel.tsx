import { plural } from "@/lib";
import { type DeliveryResult, type Destination } from "@/types";
import { Button, Empty, Panel } from "@/ui";

export function SendPanel(props: {
  destinations: Destination[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSync: () => void;
  onSendNow: () => void;
  onSchedule: () => void;
  notice: string | null;
  results: DeliveryResult[] | null;
}) {
  const nameOf = (id: string) =>
    props.destinations.find((d) => d.id === id)?.name ?? id;

  return (
    <Panel
      title="Enviar"
      eyebrow="03"
      hint="Agende para espaçar, ou envie agora."
    >
      <div className="rise space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            {props.selected.size > 0
              ? `${props.selected.size} grupo${plural(props.selected.size)} selecionado${plural(props.selected.size)}`
              : "Escolha os grupos"}
          </span>
          <button
            onClick={props.onSync}
            className="text-sm font-medium text-gold transition hover:brightness-110"
          >
            Sincronizar grupos
          </button>
        </div>

        {props.destinations.length === 0 ? (
          <Empty>Nenhum grupo ainda. Conecte o WhatsApp e sincronize.</Empty>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {props.destinations.map((d) => {
              const on = props.selected.has(d.id);
              return (
                <li key={d.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                      on
                        ? "border-gold/60 bg-gold/10 text-text"
                        : "border-line bg-panel text-muted hover:border-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => props.onToggle(d.id)}
                      className="accent-gold"
                    />
                    <span className="truncate">{d.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="go"
            size="lg"
            onClick={props.onSchedule}
            disabled={props.selected.size === 0}
          >
            Agendar envio
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={props.onSendNow}
            disabled={props.selected.size === 0}
          >
            Enviar agora
          </Button>
        </div>

        {props.notice && (
          <p className="rounded-lg border border-go/40 bg-go/10 px-4 py-3 text-sm text-go">
            {props.notice}
          </p>
        )}

        {props.results && (
          <ul className="space-y-1.5 border-t border-line pt-4 font-mono text-sm">
            {props.results.map((r) => (
              <li key={r.destinationId} className="flex items-center gap-2">
                <span className={r.status === "sent" ? "text-go" : "text-fail"}>
                  {r.status === "sent" ? "✓" : "✗"}
                </span>
                <span className="text-text">{nameOf(r.destinationId)}</span>
                {r.error && <span className="text-muted">— {r.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
