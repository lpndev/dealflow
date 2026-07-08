import { useEffect, useState } from "react";
import { apiGet, apiPut, fmtMin } from "../lib";
import { Field, Panel, ErrorNote } from "../ui";

export function SettingsTab() {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet("/settings")
      .then((s) => {
        setMin(String(Math.round(s.delayMinSeconds / 60)));
        setMax(String(Math.round(s.delayMaxSeconds / 60)));
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    setError(null);
    setSaved(false);
    try {
      await apiPut("/settings", {
        delayMinSeconds: Math.round(Number(min) * 60),
        delayMaxSeconds: Math.round(Number(max) * 60),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao salvar");
    }
  }

  const minN = Number(min) * 60;
  const maxN = Number(max) * 60;
  const preview =
    Number.isFinite(minN) && Number.isFinite(maxN) && maxN >= minN
      ? `Cada envio sai ${fmtMin(minN)}–${fmtMin(maxN)} após o anterior.`
      : "Defina um intervalo válido (máx ≥ mín).";

  return (
    <Panel title="Configurações" hint="Como a fila espaça os envios">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted">
          Intervalo aleatório entre envios da fila. Um valor entre o mínimo e o
          máximo é sorteado a cada envio, para não disparar em rajada.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Mínimo"
            mono
            prefix="min"
            value={min}
            onChange={(v) => {
              setMin(v);
              setSaved(false);
            }}
          />
          <Field
            label="Máximo"
            mono
            prefix="min"
            value={max}
            onChange={(v) => {
              setMax(v);
              setSaved(false);
            }}
          />
        </div>
        <p className="text-xs text-muted">{preview}</p>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Salvar
          </button>
          {saved && <span className="text-sm text-go">Salvo ✓</span>}
        </div>
      </div>
    </Panel>
  );
}
