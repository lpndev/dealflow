import { Checkbox } from "@dealflow/ui/checkbox";
import { Field, FieldLabel } from "@dealflow/ui/field";
import { Input } from "@dealflow/ui/input";
import { useEffect, useState } from "react";

const DEFAULTS = {
  auto: false,
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
  apiKey: "",
};

type Config = typeof DEFAULTS;
type UrlKey = "apiUrl" | "webUrl" | "apiKey";

export function Popup() {
  const [config, setConfig] = useState<Config>(DEFAULTS);

  useEffect(() => {
    chrome.storage.local.get(DEFAULTS, (v) => setConfig(v as Config));
  }, []);

  function save(patch: Partial<Config>) {
    setConfig((prev) => ({ ...prev, ...patch }));
    chrome.storage.local.set(patch);
  }

  function commit(key: UrlKey) {
    save({ [key]: config[key].trim() || DEFAULTS[key] });
  }

  return (
    <div className="flex w-72 flex-col gap-4 bg-background p-4 text-foreground">
      <h1 className="text-sm font-semibold">Dealflow Capture</h1>

      <Field orientation="horizontal">
        <Checkbox
          id="auto"
          checked={config.auto}
          onCheckedChange={(checked) => save({ auto: checked })}
        />
        <FieldLabel htmlFor="auto">Captura automática</FieldLabel>
      </Field>

      <Field>
        <FieldLabel htmlFor="apiUrl">API</FieldLabel>
        <Input
          id="apiUrl"
          value={config.apiUrl}
          onChange={(e) => setConfig((p) => ({ ...p, apiUrl: e.target.value }))}
          onBlur={() => commit("apiUrl")}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="webUrl">Web</FieldLabel>
        <Input
          id="webUrl"
          value={config.webUrl}
          onChange={(e) => setConfig((p) => ({ ...p, webUrl: e.target.value }))}
          onBlur={() => commit("webUrl")}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="apiKey">API key</FieldLabel>
        <Input
          id="apiKey"
          type="password"
          autoComplete="off"
          placeholder="cola sua chave aqui"
          value={config.apiKey}
          onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))}
          onBlur={() => commit("apiKey")}
        />
      </Field>

      <p className="text-xs text-muted-foreground">
        Abra um produto no Mercado Livre logado na sua conta de afiliado e
        clique em “Capturar oferta”.
      </p>
    </div>
  );
}
