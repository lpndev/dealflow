import { useEffect, useState, type ReactNode } from "react";

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
      setDestinations([]);
    }
  }

  async function syncDestinations() {
    setError(null);
    try {
      const res = await fetch(`${API}/destinations/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não deu para sincronizar os grupos.");
        return;
      }
      setDestinations(data.destinations ?? []);
    } catch {
      setError("A API não respondeu. Confira se ela está rodando.");
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
        setError(data.error ?? "Não deu para importar. Preencha à mão abaixo.");
        setForm((current) => current ?? emptyForm);
      }
    } catch {
      setError("A API não respondeu. Confira se ela está rodando.");
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
        setError(data.error ?? "A operação falhou.");
        return null;
      }
      return data;
    } catch {
      setError("A API não respondeu. Confira se ela está rodando.");
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

  const allSent =
    results !== null &&
    results.length > 0 &&
    results.every((r) => r.status === "sent");

  const stage = publicationId ? 3 : form ? 2 : 1;

  return (
    <div className="min-h-full">
      <TopBar />

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:grid-cols-[180px_1fr] lg:px-8">
        <Spine
          stage={stage}
          done={{ form: !!form, publicationId: !!publicationId, allSent }}
        />

        <main className="min-w-0 space-y-10">
          <Stage
            n="01"
            label="Importar"
            hint="Cole o link ou a mensagem da oferta"
          >
            <div className="space-y-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                placeholder="https://mercadolivre.com.br/…  ou a mensagem inteira do concorrente"
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
          </Stage>

          {error && (
            <p className="rise rounded-lg border border-fail/40 bg-fail/10 px-4 py-3 text-sm text-fail">
              {error}
            </p>
          )}

          {form && (
            <Stage
              n="02"
              label="Revisar"
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
                    label="URL de origem"
                    mono
                    value={form.sourceUrl}
                    onChange={(v) => update("sourceUrl", v)}
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
            </Stage>
          )}

          {publicationId && (
            <Stage
              n="03"
              label="Enviar"
              hint="Uma vez enviada, a publicação é imutável."
            >
              <div className="rise space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">
                    {selected.size > 0
                      ? `${selected.size} grupo${selected.size > 1 ? "s" : ""} selecionado${selected.size > 1 ? "s" : ""}`
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
                  <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                    Nenhum grupo ainda. Conecte o WhatsApp acima e sincronize.
                  </p>
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

                <button
                  onClick={sendPublication}
                  disabled={selected.size === 0}
                  className="w-full rounded-lg bg-go px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  Enviar para {selected.size || "os"} grupo
                  {selected.size === 1 ? "" : "s"}
                </button>

                {results && (
                  <ul className="space-y-1.5 border-t border-line pt-4 font-mono text-sm">
                    {results.map((r) => (
                      <li
                        key={r.destinationId}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={
                            r.status === "sent" ? "text-go" : "text-fail"
                          }
                        >
                          {r.status === "sent" ? "✓" : "✗"}
                        </span>
                        <span className="text-text">
                          {nameOf(r.destinationId)}
                        </span>
                        {r.error && (
                          <span className="text-muted">— {r.error}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Stage>
          )}
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 lg:px-8">
        <div className="flex items-baseline gap-2.5">
          <span className="text-base font-bold tracking-tight text-text">
            Dealflow
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            dispatch
          </span>
        </div>
        <WhatsAppStatus />
      </div>
    </header>
  );
}

const CONNECTION_LABEL: Record<string, string> = {
  open: "conectado",
  connecting: "conectando…",
  close: "desconectado",
  desconhecido: "verificando…",
  "gateway offline": "gateway offline",
};

function WhatsAppStatus() {
  const [connection, setConnection] = useState("desconhecido");
  const [qr, setQr] = useState<string | null>(null);
  const [openQr, setOpenQr] = useState(false);

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

  useEffect(() => {
    if (qr) setOpenQr(true);
    if (connection === "open") setOpenQr(false);
  }, [qr, connection]);

  const connected = connection === "open";
  const label = CONNECTION_LABEL[connection] ?? connection;

  return (
    <div className="relative">
      <button
        onClick={() => qr && setOpenQr((v) => !v)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          connected
            ? "border-go/40 bg-go/10 text-go"
            : qr
              ? "border-gold/50 bg-gold/10 text-gold hover:brightness-110"
              : "border-line bg-panel text-muted"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-go pulse-go" : qr ? "bg-gold" : "bg-muted"
          }`}
        />
        WhatsApp: {label}
        {qr && !connected && <span className="text-gold">· ver QR</span>}
      </button>

      {qr && openQr && !connected && (
        <div className="rise absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-panel p-4 shadow-2xl">
          <p className="mb-2 text-xs text-muted">
            No WhatsApp:{" "}
            <span className="text-text">
              Aparelhos conectados → Conectar um aparelho
            </span>
            , e aponte para o código.
          </p>
          <img
            src={qr}
            alt="QR de conexão do WhatsApp"
            className="w-full rounded-lg bg-white p-2"
          />
        </div>
      )}
    </div>
  );
}

function Spine(props: {
  stage: number;
  done: { form: boolean; publicationId: boolean; allSent: boolean };
}) {
  const nodes = [
    { n: "01", label: "Importar", done: props.done.form },
    { n: "02", label: "Revisar", done: props.done.publicationId },
    { n: "03", label: "Enviar", done: props.done.allSent },
  ];
  return (
    <nav className="flex gap-3 lg:sticky lg:top-20 lg:flex-col lg:gap-0 lg:self-start">
      {nodes.map((node, i) => {
        const idx = i + 1;
        const active = idx === props.stage;
        const reached = idx <= props.stage;
        return (
          <div
            key={node.n}
            className="flex flex-1 items-center gap-3 lg:flex-none lg:items-stretch"
          >
            <div className="flex flex-col items-center">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full border font-mono text-xs transition ${
                  node.done
                    ? "border-go bg-go/15 text-go"
                    : active
                      ? "border-gold bg-gold/15 text-gold"
                      : reached
                        ? "border-muted text-text"
                        : "border-line text-muted"
                }`}
              >
                {node.done ? "✓" : node.n}
              </span>
              {i < nodes.length - 1 && (
                <span
                  className={`hidden w-px flex-1 lg:my-1 lg:block ${
                    idx < props.stage ? "bg-gold/40" : "bg-line"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-sm ${
                active ? "font-semibold text-text" : "text-muted"
              } ${i < nodes.length - 1 ? "lg:pb-8" : ""}`}
            >
              {node.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

function Stage(props: {
  n: string;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 lg:p-6">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-xs text-gold">{props.n}</span>
        <h2 className="text-lg font-semibold text-text">{props.label}</h2>
        <span className="ml-auto hidden text-xs text-muted sm:block">
          {props.hint}
        </span>
      </div>
      {props.children}
    </section>
  );
}

function PreviewBubble(props: { text: string; ready: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-mono uppercase tracking-wider">Preview</span>
        {props.ready && (
          <span className="rounded-full bg-go/15 px-2 py-0.5 text-go">
            pronta para envio
          </span>
        )}
      </div>
      <div className="rounded-xl rounded-tl-sm bg-[#005c4b] p-3 shadow-lg">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-white">
          {props.text}
        </pre>
        <div className="mt-1 text-right text-[10px] text-white/60">
          agora ✓✓
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-2 text-xs font-medium uppercase tracking-wider text-muted">
        {props.label}
        {props.hint && (
          <span className="normal-case tracking-normal text-muted/70">
            {props.hint}
          </span>
        )}
      </label>
      <div className="flex items-center rounded-lg border border-line bg-inset focus-within:border-gold">
        {props.prefix && (
          <span className="pl-3 font-mono text-sm text-muted">
            {props.prefix}
          </span>
        )}
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`w-full bg-transparent px-3 py-2 text-sm text-text focus:outline-none ${
            props.mono ? "font-mono" : ""
          }`}
        />
      </div>
    </div>
  );
}
