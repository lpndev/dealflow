import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:3002";

type Draft = {
  sourceUrl: string;
  product: { externalId?: string; title?: string; imageUrl?: string };
  price: { original?: number; current?: number };
  coupon?: string;
};

type Form = {
  title: string;
  imageUrl: string;
  originalPrice: string;
  currentPrice: string;
  coupon: string;
  sourceUrl: string;
  affiliateUrl: string;
};

type Destination = { id: string; name: string };
type DeliveryResult = {
  destinationId: string;
  status: "sent" | "failed";
  error?: string;
};

const emptyForm: Form = {
  title: "",
  imageUrl: "",
  originalPrice: "",
  currentPrice: "",
  coupon: "",
  sourceUrl: "",
  affiliateUrl: "",
};

function draftToForm(draft: Draft): Form {
  return {
    ...emptyForm,
    title: draft.product.title ?? "",
    imageUrl: draft.product.imageUrl ?? "",
    originalPrice: draft.price.original?.toString() ?? "",
    currentPrice: draft.price.current?.toString() ?? "",
    coupon: draft.coupon ?? "",
    sourceUrl: draft.sourceUrl,
  };
}

export function App() {
  const [input, setInput] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<DeliveryResult[] | null>(null);

  useEffect(() => {
    void loadDestinations();
  }, []);

  async function loadDestinations() {
    try {
      const res = await fetch(`${API}/destinations`);
      const data = await res.json();
      setDestinations(data.destinations ?? []);
    } catch {
      // ponytail: silent; the sync button surfaces gateway errors
    }
  }

  async function syncDestinations() {
    setError(null);
    try {
      const res = await fetch(`${API}/destinations/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "falha ao sincronizar grupos");
        return;
      }
      setDestinations(data.destinations ?? []);
    } catch {
      setError("não foi possível falar com a api");
    }
  }

  async function importDeal() {
    setLoading(true);
    setError(null);
    setPreview(null);
    setPublicationId(null);
    setResults(null);
    try {
      const res = await fetch(`${API}/deals/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm(draftToForm(data.draft));
      } else {
        setError(data.error ?? "falha ao importar");
        setForm((current) => current ?? emptyForm);
      }
    } catch {
      setError("não foi possível falar com a api");
      setForm((current) => current ?? emptyForm);
    } finally {
      setLoading(false);
    }
  }

  function update(field: keyof Form, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setPublicationId(null);
    setResults(null);
  }

  async function post(path: string, body: unknown) {
    setError(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "falha na operação");
        return null;
      }
      return data;
    } catch {
      setError("não foi possível falar com a api");
      return null;
    }
  }

  async function showPreview() {
    if (!form) return;
    const data = await post("/publications/preview", form);
    if (data) setPreview(String(data.content));
  }

  async function save() {
    if (!form) return;
    const data = await post("/publications", form);
    if (data) {
      setPreview(String(data.content));
      setPublicationId(String(data.id));
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendPublication() {
    if (!publicationId || selected.size === 0) return;
    const data = await post(`/publications/${publicationId}/send`, {
      destinationIds: [...selected],
    });
    if (data) setResults(data.results ?? []);
  }

  const nameOf = (id: string) =>
    destinations.find((d) => d.id === id)?.name ?? id;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Nova oferta</h1>

      <WhatsAppPanel />

      <div className="space-y-2">
        <label className="text-sm text-gray-500">
          Cole uma URL ou mensagem
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full rounded border border-gray-300 p-2 font-mono text-sm"
        />
        <button
          onClick={importDeal}
          disabled={loading || input.trim() === ""}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
        >
          {loading ? "Importando…" : "Importar"}
        </button>
      </div>

      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {form && (
        <div className="space-y-4">
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt=""
              className="max-h-48 rounded border border-gray-200"
            />
          )}
          <Field
            label="Título"
            value={form.title}
            onChange={(v) => update("title", v)}
          />
          <Field
            label="Imagem (URL)"
            value={form.imageUrl}
            onChange={(v) => update("imageUrl", v)}
          />
          <Field
            label="Preço anterior"
            value={form.originalPrice}
            onChange={(v) => update("originalPrice", v)}
          />
          <Field
            label="Preço atual"
            value={form.currentPrice}
            onChange={(v) => update("currentPrice", v)}
          />
          <Field
            label="Cupom"
            value={form.coupon}
            onChange={(v) => update("coupon", v)}
          />
          <Field
            label="URL de origem"
            value={form.sourceUrl}
            onChange={(v) => update("sourceUrl", v)}
          />
          <Field
            label="Link afiliado"
            value={form.affiliateUrl}
            onChange={(v) => update("affiliateUrl", v)}
          />

          <div className="flex gap-2">
            <button
              onClick={showPreview}
              className="rounded border border-gray-300 px-4 py-2"
            >
              Preview
            </button>
            <button
              onClick={save}
              className="rounded bg-black px-4 py-2 text-white"
            >
              Salvar publicação
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Preview</span>
            {publicationId && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">
                pronta para envio
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-sm">
            {preview}
          </pre>
        </div>
      )}

      {publicationId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Destinos</span>
            <button
              onClick={syncDestinations}
              className="text-sm text-blue-600 hover:underline"
            >
              Sincronizar grupos
            </button>
          </div>

          {destinations.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nenhum grupo. Conecte o WhatsApp e sincronize.
            </p>
          ) : (
            <ul className="space-y-1">
              {destinations.map((d) => (
                <li key={d.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggle(d.id)}
                    />
                    <span>{d.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={sendPublication}
            disabled={selected.size === 0}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      )}

      {results && (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.destinationId} className="flex items-center gap-2">
              <span
                className={
                  r.status === "sent" ? "text-green-700" : "text-red-700"
                }
              >
                {r.status === "sent" ? "✓" : "✗"}
              </span>
              <span>{nameOf(r.destinationId)}</span>
              {r.error && <span className="text-gray-400">— {r.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function WhatsAppPanel() {
  const [connection, setConnection] = useState("desconhecido");
  const [qr, setQr] = useState<string | null>(null);

  async function refresh() {
    try {
      const session = await fetch(`${GATEWAY}/session`).then((r) => r.json());
      setConnection(session.connection);
      if (session.hasQr) {
        const data = await fetch(`${GATEWAY}/session/qr`).then((r) => r.json());
        setQr(data.qr ?? null);
      } else {
        setQr(null);
      }
    } catch {
      setConnection("gateway offline");
      setQr(null);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded border border-gray-200 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={connection === "open" ? "text-green-600" : "text-gray-400"}
        >
          ●
        </span>
        <span>WhatsApp: {connection}</span>
      </div>
      {qr && (
        <div className="mt-2">
          <p className="text-gray-500">Escaneie para conectar:</p>
          <img src={qr} alt="QR" className="mt-1 h-48 w-48" />
        </div>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-500">{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded border border-gray-300 p-2"
      />
    </div>
  );
}
