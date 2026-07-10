import { useEffect, useState } from "react";
import { ImportPanel, ReviewPanel, SendPanel } from "@/components/new-offer";
import { usePolling } from "@/hooks";
import {
  API_DOWN,
  apiGet,
  apiPost,
  draftToForm,
  emptyForm,
  plural,
} from "@/lib";
import {
  type DeliveryResult,
  type Destination,
  type Draft,
  type Form,
} from "@/types";
import { Button, ErrorNote } from "@/ui";

const DRAFT_INPUT_KEY = "dealflow:draft:input";
const DRAFT_FORM_KEY = "dealflow:draft:form";

export function NewOffer(props: { onQueued: () => void }) {
  const [input, setInput] = useState(
    () => localStorage.getItem(DRAFT_INPUT_KEY) ?? "",
  );
  const [form, setForm] = useState<Form | null>(() => {
    const saved = localStorage.getItem(DRAFT_FORM_KEY);
    return saved ? (JSON.parse(saved) as Form) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<DeliveryResult[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Draft | null>(null);
  const [startAt, setStartAt] = useState("");

  useEffect(() => {
    localStorage.setItem(DRAFT_INPUT_KEY, input);
  }, [input]);
  useEffect(() => {
    if (form) localStorage.setItem(DRAFT_FORM_KEY, JSON.stringify(form));
    else localStorage.removeItem(DRAFT_FORM_KEY);
  }, [form]);

  useEffect(() => {
    apiGet("/destinations")
      .then((d) => setDestinations(d.destinations ?? []))
      .catch(() => setDestinations([]));
  }, []);

  usePolling(async () => {
    try {
      const d = await apiGet("/deals/capture");
      if (!d?.draft) return;
      const draft = d.draft as Draft;
      if (!form) {
        setForm(draftToForm(draft));
      } else if (
        !form.affiliateUrl &&
        draft.affiliateUrl &&
        form.externalId &&
        form.externalId === draft.product.externalId
      ) {
        const affiliateUrl = draft.affiliateUrl;
        setForm((c) => (c ? { ...c, affiliateUrl } : c));
        setNotice("Seu link de afiliado foi gerado e preenchido.");
      } else {
        setCaptured(draft);
      }
    } catch {
      /* extensão ou API offline — segue */
    }
  }, 4000);

  function generateAffiliate() {
    if (!form?.sourceUrl) return;
    window.open(`${form.sourceUrl}#dealflow-auto`, "_blank", "noopener");
  }

  async function importDeal() {
    setLoading(true);
    setError(null);
    setPreview(null);
    setPublicationId(null);
    setResults(null);
    setNotice(null);
    try {
      const data = await apiPost("/deals/import", { input });
      setForm(draftToForm(data.draft));
    } catch (e) {
      const msg = e instanceof Error ? e.message : API_DOWN;
      setError(
        msg === API_DOWN
          ? API_DOWN
          : "Não deu para importar. Preencha à mão abaixo.",
      );
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
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
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

  return (
    <div className="space-y-8">
      <ImportPanel
        value={input}
        onChange={setInput}
        loading={loading}
        onImport={importDeal}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {captured && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-text">
          <span>Oferta capturada da extensão pronta para carregar.</span>
          <Button
            size="sm"
            onClick={() => {
              setForm(draftToForm(captured));
              setCaptured(null);
            }}
          >
            Carregar
          </Button>
        </div>
      )}

      {form && (
        <ReviewPanel
          form={form}
          onChange={update}
          onPreview={showPreview}
          onSave={save}
          preview={preview}
          ready={!!publicationId}
          needsAffiliate={!form.affiliateUrl && !!form.externalId}
          onGenerate={generateAffiliate}
        />
      )}

      {publicationId && (
        <SendPanel
          destinations={destinations}
          selected={selected}
          onToggle={toggle}
          onSync={syncDestinations}
          onSendNow={sendNow}
          onSchedule={schedule}
          startAt={startAt}
          onStartAt={setStartAt}
          notice={notice}
          results={results}
        />
      )}
    </div>
  );
}
