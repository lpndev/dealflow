import { Button, Panel } from "@/ui";

export function ImportPanel(props: {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  onImport: () => void;
}) {
  return (
    <Panel
      title="Importar"
      eyebrow="01"
      hint="Cole o link ou a mensagem da oferta"
    >
      <div className="space-y-3">
        <textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          rows={4}
          placeholder="https://meli.la/…  ou a mensagem inteira do concorrente"
          className="w-full resize-y rounded-lg border border-line bg-inset p-3 font-mono text-sm text-text placeholder:text-muted/60 focus:border-gold focus:outline-none"
        />
        <Button
          onClick={props.onImport}
          disabled={props.loading || props.value.trim() === ""}
        >
          {props.loading ? "Importando…" : "Importar oferta"}
        </Button>
      </div>
    </Panel>
  );
}
