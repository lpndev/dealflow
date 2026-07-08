import { useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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

  async function importDeal() {
    setLoading(true);
    setError(null);
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
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Nova oferta</h1>

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
        </div>
      )}
    </main>
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
