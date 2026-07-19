import { Field, FieldLabel } from "@dealflow/ui/field";
import { Input } from "@dealflow/ui/input";
import { useEffect, useState } from "react";

const DEFAULTS = {
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
  apiKey: "",
};

type Config = typeof DEFAULTS;
type Key = keyof Config;

export function Popup() {
  const [config, setConfig] = useState<Config>(DEFAULTS);

  useEffect(() => {
    chrome.storage.local.get(DEFAULTS, (v) => setConfig(v as Config));
  }, []);

  function save(key: Key, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    void chrome.storage.local.set({ [key]: value });
  }

  function normalize(key: "apiUrl" | "webUrl") {
    save(key, config[key].trim() || DEFAULTS[key]);
  }

  return (
    <div className="flex w-72 flex-col gap-4 bg-background p-4 text-foreground">
      <h1 className="text-sm font-semibold">Dealflow Capture</h1>

      <Field>
        <FieldLabel htmlFor="apiUrl">API</FieldLabel>
        <Input
          id="apiUrl"
          value={config.apiUrl}
          onChange={(e) => save("apiUrl", e.target.value)}
          onBlur={() => normalize("apiUrl")}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="webUrl">Web</FieldLabel>
        <Input
          id="webUrl"
          value={config.webUrl}
          onChange={(e) => save("webUrl", e.target.value)}
          onBlur={() => normalize("webUrl")}
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
          onChange={(e) => save("apiKey", e.target.value)}
        />
      </Field>

      <p className="text-xs text-muted-foreground">
        Abra um produto no Mercado Livre logado na sua conta de afiliado e
        clique em “Capturar oferta”.
      </p>
    </div>
  );
}
