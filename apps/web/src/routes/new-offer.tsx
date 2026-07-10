import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ErrorNote } from "@/components";
import { ImportPanel, ReviewPanel, SendPanel } from "@/components/new-offer";
import { Button } from "@/components/ui/button";
import {
  API_DOWN,
  apiGet,
  apiPost,
  draftToForm,
  emptyForm,
  errMsg,
  mergeCapture,
  plural,
} from "@/lib";
import {
  type DeliveryResult,
  type Destination,
  type Draft,
  type Form,
} from "@/types";

const DRAFT_INPUT_KEY = "dealflow:draft:input";
const DRAFT_FORM_KEY = "dealflow:draft:form";

export function NewOffer() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [input, setInput] = useState(
    () => localStorage.getItem(DRAFT_INPUT_KEY) ?? "",
  );
  const [form, setForm] = useState<Form | null>(() => {
    const saved = localStorage.getItem(DRAFT_FORM_KEY);
    return saved ? (JSON.parse(saved) as Form) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<DeliveryResult[] | null>(null);
  const [captured, setCaptured] = useState<Draft | null>(null);
  const [startAt, setStartAt] = useState("");

  useEffect(() => {
    localStorage.setItem(DRAFT_INPUT_KEY, input);
  }, [input]);
  useEffect(() => {
    if (form) localStorage.setItem(DRAFT_FORM_KEY, JSON.stringify(form));
    else localStorage.removeItem(DRAFT_FORM_KEY);
  }, [form]);

  const { data: destData } = useQuery<{ destinations: Destination[] }>({
    queryKey: ["destinations"],
    queryFn: () => apiGet("/destinations"),
  });
  const destinations = destData?.destinations ?? [];

  const initSelected = useRef(false);
  useEffect(() => {
    if (initSelected.current || !destData) return;
    initSelected.current = true;
    setSelected(
      new Set(destData.destinations.filter((x) => x.enabled).map((x) => x.id)),
    );
  }, [destData]);

  const { data: capture } = useQuery<{ draft: Draft | null }>({
    queryKey: ["capture"],
    queryFn: () => apiGet("/deals/capture"),
    refetchInterval: 4000,
  });
  const formRef = useRef(form);
  formRef.current = form;
  useEffect(() => {
    const draft = capture?.draft;
    if (!draft) return;
    const current = formRef.current;
    if (!current) {
      setForm(draftToForm(draft));
    } else if (
      current.externalId &&
      current.externalId === draft.product.externalId
    ) {
      setForm(mergeCapture(current, draft));
      toast.success("Atualizado com o link e o preço reais do ML.");
    } else {
      setCaptured(draft);
    }
  }, [capture]);

  function generateAffiliate() {
    if (!form?.sourceUrl) return;
    window.open(`${form.sourceUrl}#dealflow-auto`, "_blank", "noopener");
  }

  const importDeal = useMutation({
    mutationFn: (value: string) => apiPost("/deals/import", { input: value }),
    onMutate: () => {
      setError(null);
      setPreview(null);
      setPublicationId(null);
      setResults(null);
    },
    onSuccess: (data) => setForm(draftToForm(data.draft)),
    onError: (e) => {
      const msg = errMsg(e, API_DOWN);
      setError(
        msg === API_DOWN
          ? API_DOWN
          : "Não deu para importar. Preencha à mão abaixo.",
      );
      setForm((c) => c ?? emptyForm);
    },
  });

  const syncDestinations = useMutation({
    mutationFn: () => apiPost("/destinations/sync", {}),
    onSuccess: (data) => qc.setQueryData(["destinations"], data),
    onError: (e) => setError(errMsg(e, API_DOWN)),
  });

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
      setError(errMsg(e, API_DOWN));
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
      toast.success(
        n > 0
          ? `${n} envio${plural(n)} na fila, espaçados para parecer humano.`
          : "Esses grupos já estavam na fila.",
      );
      qc.invalidateQueries({ queryKey: ["queue"] });
      navigate("/queue");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <ImportPanel
        value={input}
        onChange={setInput}
        loading={importDeal.isPending}
        onImport={() => importDeal.mutate(input)}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {captured && (
        <div className="flex items-center justify-between gap-4 border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-foreground">
          <span>Oferta capturada da extensão pronta para carregar.</span>
          <Button
            size="sm"
            onClick={() => {
              setForm(draftToForm(captured));
              setCaptured(null);
            }}
          >
            <DownloadSimpleIcon />
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
          needsPrice={
            !!form.affiliateUrl && !form.currentPrice && !!form.externalId
          }
          onGenerate={generateAffiliate}
        />
      )}

      {publicationId && (
        <SendPanel
          destinations={destinations}
          selected={selected}
          onToggle={toggle}
          onSync={() => syncDestinations.mutate()}
          onSendNow={sendNow}
          onSchedule={schedule}
          startAt={startAt}
          onStartAt={setStartAt}
          results={results}
        />
      )}
    </div>
  );
}
