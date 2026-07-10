import { CheckIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  ErrorNote,
  Field,
  GroupsConfig,
  Panel,
  PreviewBubble,
  WhatsAppConfig,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPut, fmtMin } from "@/lib";
import { type Settings } from "@/types";

const PLACEHOLDERS = [
  { key: "{titulo}", desc: "nome do produto" },
  { key: "{de}", desc: "preço antigo" },
  { key: "{por}", desc: "preço atual" },
  { key: "{cupom}", desc: "cupom (some se vazio)" },
  { key: "{link}", desc: "link de afiliado (obrigatório)" },
];

const SAMPLE: Record<string, string> = {
  "{titulo}": "Air Fryer Mondial 5L",
  "{de}": "R$ 499,00",
  "{por}": "R$ 299,00",
  "{cupom}": "CASA20",
  "{link}": "https://meli.la/aBcD",
};

function renderSample(template: string): string {
  return template
    .replace(/\{\w+\}/g, (m) => SAMPLE[m] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function SettingsTab() {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [template, setTemplate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    apiGet("/settings")
      .then((s: Settings) => {
        setMin(String(Math.round(s.delayMinSeconds / 60)));
        setMax(String(Math.round(s.delayMaxSeconds / 60)));
        setTemplate(s.messageTemplate);
      })
      .catch((e) => setError(e.message));
  }, []);

  function touch<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setSaved(false);
    };
  }

  function insert(placeholder: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? template.length;
    const end = el?.selectionEnd ?? template.length;
    const next = template.slice(0, start) + placeholder + template.slice(end);
    setTemplate(next);
    setSaved(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + placeholder.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  async function save() {
    setError(null);
    setSaved(false);
    try {
      await apiPut("/settings", {
        delayMinSeconds: Math.round(Number(min) * 60),
        delayMaxSeconds: Math.round(Number(max) * 60),
        messageTemplate: template,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao salvar");
    }
  }

  const minN = Number(min) * 60;
  const maxN = Number(max) * 60;
  const delayPreview =
    Number.isFinite(minN) && Number.isFinite(maxN) && maxN >= minN
      ? `Cada envio sai ${fmtMin(minN)}–${fmtMin(maxN)} após o anterior.`
      : "Defina um intervalo válido (máx ≥ mín).";

  const missingLink = !template.includes("{link}");

  return (
    <div className="flex flex-col gap-8">
      <WhatsAppConfig />

      <GroupsConfig />

      <Panel title="Espaçamento" hint="Como a fila distribui os envios">
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Intervalo aleatório entre envios da fila. Um valor entre o mínimo e
            o máximo é sorteado a cada envio, para não disparar em rajada.
          </p>
          <div className="flex gap-4 *:flex-1">
            <Field
              label="Mínimo"
              mono
              prefix="min"
              value={min}
              onChange={touch(setMin)}
            />
            <Field
              label="Máximo"
              mono
              prefix="min"
              value={max}
              onChange={touch(setMax)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{delayPreview}</p>
        </div>
      </Panel>

      <Panel title="Mensagem" hint="O template de toda oferta publicada">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 lg:min-w-0">
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map((p) => (
                <Button
                  key={p.key}
                  variant="outline"
                  size="xs"
                  onClick={() => insert(p.key)}
                  title={`Inserir ${p.desc}`}
                  className="font-mono text-primary"
                >
                  {p.key}
                </Button>
              ))}
            </div>
            <Textarea
              ref={ref}
              value={template}
              onChange={(e) => touch(setTemplate)(e.target.value)}
              rows={9}
              className="resize-y font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Uma linha some sozinha quando seu único campo fica vazio (ex.: sem
              cupom). O{" "}
              <span className="font-mono text-primary">{"{link}"}</span> é
              obrigatório — é o que monetiza.
            </p>
          </div>

          <div className="lg:w-80">
            <PreviewBubble text={renderSample(template)} />
          </div>
        </div>
      </Panel>

      {missingLink && (
        <ErrorNote>
          O template precisa conter {"{link}"} — senão a oferta sai sem o link
          de afiliado.
        </ErrorNote>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={missingLink}>
          <FloppyDiskIcon />
          Salvar configurações
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckIcon className="size-4" />
            Salvo
          </span>
        )}
      </div>
    </div>
  );
}
