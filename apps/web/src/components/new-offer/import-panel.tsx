import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Panel } from "@/components";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
