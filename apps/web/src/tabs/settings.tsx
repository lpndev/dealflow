import { useEffect, useRef, useState } from "react";
import { apiGet, apiPut, fmtMin } from "@/lib";
import { type Settings } from "@/types";
import { Button, ErrorNote, Field, Panel, PreviewBubble } from "@/ui";

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
    <div className="space-y-8">
      <Panel title="Espaçamento" hint="Como a fila distribui os envios">
        <div className="max-w-md space-y-4">
          <p className="text-sm text-muted">
            Intervalo aleatório entre envios da fila. Um valor entre o mínimo e
            o máximo é sorteado a cada envio, para não disparar em rajada.
          </p>
          <div className="grid grid-cols-2 gap-3">
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
          <p className="text-xs text-muted">{delayPreview}</p>
        </div>
      </Panel>

      <Panel title="Mensagem" hint="O template de toda oferta publicada">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,320px)]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => insert(p.key)}
                  title={`Inserir ${p.desc}`}
                  className="rounded-md border border-line bg-inset px-2 py-1 font-mono text-xs text-gold transition hover:border-gold"
                >
                  {p.key}
                </button>
              ))}
            </div>
            <textarea
              ref={ref}
              value={template}
              onChange={(e) => touch(setTemplate)(e.target.value)}
              rows={9}
              className="w-full resize-y rounded-lg border border-line bg-inset p-3 font-mono text-sm text-text focus:border-gold focus:outline-none"
            />
            <p className="text-xs text-muted">
              Uma linha some sozinha quando seu único campo fica vazio (ex.: sem
              cupom). O <span className="font-mono text-gold">{"{link}"}</span>{" "}
              é obrigatório — é o que monetiza.
            </p>
          </div>

          <PreviewBubble text={renderSample(template)} />
        </div>
      </Panel>

      {missingLink && (
        <ErrorNote>
          O template precisa conter {"{link}"} — senão a oferta sai sem o link
          de afiliado.
        </ErrorNote>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={missingLink}>
          Salvar configurações
        </Button>
        {saved && <span className="text-sm text-go">Salvo ✓</span>}
      </div>
    </div>
  );
}
