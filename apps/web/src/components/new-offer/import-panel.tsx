import { Button } from "@dealflow/ui/button";
import { Textarea } from "@dealflow/ui/textarea";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Panel } from "@/components";

export function ImportPanel(props: {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  onImport: () => void;
}) {
  return (
    <Panel title="Importar" eyebrow="01">
      <Textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={4}
        placeholder="https://meli.la/…  ou a mensagem inteira do concorrente"
        className="min-h-40 resize-y font-mono"
      />
      <Button
        onClick={props.onImport}
        disabled={props.loading || props.value.trim() === ""}
      >
        <ClipboardTextIcon />
        {props.loading ? "Importando…" : "Importar oferta"}
      </Button>
    </Panel>
  );
}
