import { useEffect, useRef, useState } from "react";
import { API, API_DOWN, apiGet, apiPost, plural } from "../lib";
import { Field, Panel, Empty, ErrorNote, PreviewBubble } from "../ui";

type Draft = {
  sourceUrl: string;
  affiliateUrl?: string;
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
    affiliateUrl: draft.affiliateUrl ?? "",
  };
}

export function NewOffer(props: { onQueued: () => void }) {
  const [input, setInput] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<DeliveryResult[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Draft | null>(null);
  const formRef = useRef<Form | null>(null);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    apiGet("/destinations")
      .then((d) => setDestinations(d.destinations ?? []))
      .catch(() => setDestinations([]));
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const d = await apiGet("/deals/capture");
        if (!alive || !d?.draft) return;
        if (!formRef.current) setForm(draftToForm(d.draft));
        else setCaptured(d.draft);
      } catch {
        /* extensão ou API offline — segue */
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function importDeal() {
    setLoading(true);
    setError(null);
    setPreview(null);
    setPublicationId(null);
    setResults(null);
    setNotice(null);
    try {
      const res = await fetch(`${API}/deals/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (res.ok) setForm(draftToForm(data.draft));
      else {
        setError(data.error ?? "Não deu para importar. Preencha à mão abaixo.");
        setForm((c) => c ?? emptyForm);
      }
    } catch {
      setError(API_DOWN);
      setForm((c) => c ?? emptyForm);
    } finally {
      setLoading(false);
    }
  }

  function update(field: keyof Form, value: string) {
    setForm((c) => (c ? { ...c, [field]: value } : c));
    setPublicationId(null);
    setResults(null);
  }

  async function call(path: string, body: unknown) {
    setError(null);
    try {
      return await apiPost(path, body);
    } catch (e) {
      setError(e instanceof Error ? e.message : API_DOWN);
      return null;
    }
  }

  async function showPreview() {
    if (!form) return;
    const data = await call("/publications/preview", form);
    if (data) setPreview(String(data.content));
  }

  async function save() {
    if (!form) return;
    const data = await call("/publications", form);
    if (data) {
      setPreview(String(data.content));
      setPublicationId(String(data.id));
    }
  }

  async function syncDestinations() {
    const data = await call("/destinations/sync", {});
    if (data) setDestinations(data.destinations ?? []);
  }

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendNow() {
    if (!publicationId || selected.size === 0) return;
    const data = await call(`/publications/${publicationId}/send`, {
      destinationIds: [...selected],
    });
    if (data) setResults(data.results ?? []);
  }

  async function schedule() {
    if (!publicationId || selected.size === 0) return;
    const data = await call(`/publications/${publicationId}/schedule`, {
      destinationIds: [...selected],
    });
    if (data) {
      const n = data.scheduled?.length ?? 0;
      setNotice(
        n > 0
          ? `${n} envio${plural(n)} na fila, espaçados para parecer humano.`
          : "Esses grupos já estavam na fila.",
      );
      props.onQueued();
    }
  }

  const nameOf = (id: string) =>
    destinations.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <Panel
        title="Importar"
        eyebrow="01"
        hint="Cole o link ou a mensagem da oferta"
      >
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="https://meli.la/…  ou a mensagem inteira do concorrente"
            className="w-full resize-y rounded-lg border border-line bg-inset p-3 font-mono text-sm text-text placeholder:text-muted/60 focus:border-gold focus:outline-none"
          />
          <button
            onClick={importDeal}
            disabled={loading || input.trim() === ""}
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Importando…" : "Importar oferta"}
          </button>
        </div>
      </Panel>

      {error && <ErrorNote>{error}</ErrorNote>}

      {captured && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-text">
          <span>Oferta capturada da extensão pronta para carregar.</span>
          <button
            onClick={() => {
              setForm(draftToForm(captured));
              setCaptured(null);
            }}
            className="rounded-lg bg-gold px-4 py-1.5 font-semibold text-ink transition hover:brightness-110"
          >
            Carregar
          </button>
        </div>
      )}

      {form && (
        <Panel
          title="Revisar"
          eyebrow="02"
          hint="O operador decide. Ajuste antes de publicar."
        >
          <div className="rise grid gap-6 lg:grid-cols-[1fr_minmax(0,320px)]">
            <div className="space-y-4">
              <Field
                label="Título"
                value={form.title}
                onChange={(v) => update("title", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Preço De"
                  mono
                  prefix="R$"
                  value={form.originalPrice}
                  onChange={(v) => update("originalPrice", v)}
                />
                <Field
                  label="Preço Por"
                  mono
                  prefix="R$"
                  value={form.currentPrice}
                  onChange={(v) => update("currentPrice", v)}
                />
              </div>
              <Field
                label="Cupom"
                mono
                value={form.coupon}
                onChange={(v) => update("coupon", v)}
              />
              <Field
                label="Imagem (URL)"
                mono
                value={form.imageUrl}
                onChange={(v) => update("imageUrl", v)}
              />
              <Field
                label="Link afiliado"
                mono
                hint="Nosso link — é o que monetiza"
                value={form.affiliateUrl}
                onChange={(v) => update("affiliateUrl", v)}
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={showPreview}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-text transition hover:border-muted"
                >
                  Pré-visualizar
                </button>
                <button
                  onClick={save}
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
                >
                  Salvar publicação
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt=""
                  className="max-h-52 w-full rounded-lg border border-line object-contain bg-inset p-2"
                />
              )}
              {preview && (
                <PreviewBubble text={preview} ready={!!publicationId} />
              )}
            </div>
          </div>
        </Panel>
      )}

      {publicationId && (
        <Panel
          title="Enviar"
          eyebrow="03"
          hint="Agende para espaçar, ou envie agora."
        >
          <div className="rise space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                {selected.size > 0
                  ? `${selected.size} grupo${plural(selected.size)} selecionado${plural(selected.size)}`
                  : "Escolha os grupos"}
              </span>
              <button
                onClick={syncDestinations}
                className="text-sm font-medium text-gold transition hover:brightness-110"
              >
                Sincronizar grupos
              </button>
            </div>

            {destinations.length === 0 ? (
              <Empty>
                Nenhum grupo ainda. Conecte o WhatsApp e sincronize.
              </Empty>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {destinations.map((d) => {
                  const on = selected.has(d.id);
                  return (
                    <li key={d.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                          on
                            ? "border-gold/60 bg-gold/10 text-text"
                            : "border-line bg-panel text-muted hover:border-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(d.id)}
                          className="accent-gold"
                        />
                        <span className="truncate">{d.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={schedule}
                disabled={selected.size === 0}
                className="rounded-lg bg-go px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Agendar envio
              </button>
              <button
                onClick={sendNow}
                disabled={selected.size === 0}
                className="rounded-lg border border-line px-5 py-3 text-sm font-medium text-text transition hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Enviar agora
              </button>
            </div>

            {notice && (
              <p className="rounded-lg border border-go/40 bg-go/10 px-4 py-3 text-sm text-go">
                {notice}
              </p>
            )}

            {results && (
              <ul className="space-y-1.5 border-t border-line pt-4 font-mono text-sm">
                {results.map((r) => (
                  <li key={r.destinationId} className="flex items-center gap-2">
                    <span
                      className={r.status === "sent" ? "text-go" : "text-fail"}
                    >
                      {r.status === "sent" ? "✓" : "✗"}
                    </span>
                    <span className="text-text">{nameOf(r.destinationId)}</span>
                    {r.error && <span className="text-muted">— {r.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
