import { FloppyDiskIcon } from "@phosphor-icons/react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import {
  ApiKeysPanel,
  DangerZone,
  ErrorNote,
  GroupsConfig,
  Panel,
  PreviewBubble,
  WhatsAppConfig,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import {
  apiGet,
  apiPut,
  errMsg,
  fmtMin,
  useCanManage,
  useUnsavedWarning,
} from "@/lib";
import { type Settings } from "@/types";

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

type DelayFieldApi = {
  state: {
    value: string;
    meta: { isTouched: boolean; isValid: boolean; errors: unknown[] };
  };
  handleBlur: () => void;
  handleChange: (value: string) => void;
};

function DelayField({
  field,
  id,
  label,
}: {
  field: DelayFieldApi;
  id: string;
  label: string;
}) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>min</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          className="font-mono"
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={invalid}
        />
      </InputGroup>
      {invalid && <FieldError>{String(field.state.meta.errors[0])}</FieldError>}
    </Field>
  );
}

export function SettingsTab() {
  const { data, error } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiGet("/settings"),
  });
  const canManage = useCanManage();

  return (
    <div className="flex flex-col gap-8">
      <WhatsAppConfig />
      <GroupsConfig />
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {data && <SettingsForm settings={data} />}
      {canManage && <ApiKeysPanel />}
      <DangerZone />
    </div>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLTextAreaElement>(null);

  const save = useMutation({
    mutationFn: (v: {
      min: string;
      max: string;
      tag: string;
      template: string;
    }) =>
      apiPut("/settings", {
        delayMinSeconds: Math.round(Number(v.min) * 60),
        delayMaxSeconds: Math.round(Number(v.max) * 60),
        messageTemplate: v.template,
        mlAffiliateTag: v.tag,
      }),
    onSuccess: (d) => {
      qc.setQueryData(["settings"], d);
      toast.success("Configurações salvas.");
    },
    onError: (e) => toast.error(errMsg(e, "falha ao salvar")),
  });

  const form = useForm({
    defaultValues: {
      min: String(Math.round(settings.delayMinSeconds / 60)),
      max: String(Math.round(settings.delayMaxSeconds / 60)),
      tag: settings.mlAffiliateTag ?? "",
      template: settings.messageTemplate,
    },
    onSubmit: async ({ value }) => {
      const ok = await save.mutateAsync(value).then(
        () => true,
        () => false,
      );
      if (ok) form.reset(value);
    },
  });

  const isDirty = useStore(form.store, (s) => s.isDirty);
  useUnsavedWarning(isDirty);

  function insertPlaceholder(current: string, placeholder: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + placeholder + current.slice(end);
    form.setFieldValue("template", next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + placeholder.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-8"
    >
      <Panel
        title="Sua etiqueta de afiliado (ML)"
        hint={
          <>
            Ao colar um <span className="font-mono">meli.la</span> seu, o
            sistema só o usa como afiliado se a etiqueta bater com a sua — assim
            seu próprio link não pede pra ser gerado de novo. É a{" "}
            <span className="font-mono">tag</span> em uso na sua conta de
            afiliado (formato <span className="font-mono">ct</span>+números).
          </>
        }
      >
        <div className="flex max-w-md flex-col gap-4">
          <form.Field name="tag">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="settings-tag">Etiqueta (tag)</FieldLabel>
                <Input
                  id="settings-tag"
                  className="font-mono"
                  placeholder="ct1234567890000"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>
        </div>
      </Panel>

      <Panel
        title="Espaçamento"
        hint="Intervalo aleatório entre envios da fila. Um valor entre o mínimo e o máximo é sorteado a cada envio, para não disparar em rajada."
      >
        <div className="flex max-w-md flex-col gap-4">
          <div className="flex gap-4 *:flex-1">
            <form.Field
              name="min"
              validators={{
                onChange: ({ value }) =>
                  Number(value) > 0 ? undefined : "Informe um mínimo válido.",
              }}
            >
              {(field) => (
                <DelayField field={field} id="settings-min" label="Mínimo" />
              )}
            </form.Field>
            <form.Field
              name="max"
              validators={{
                onChangeListenTo: ["min"],
                onChange: ({ value, fieldApi }) =>
                  Number(value) >= Number(fieldApi.form.getFieldValue("min")) &&
                  Number(value) > 0
                    ? undefined
                    : "O máximo precisa ser ≥ o mínimo.",
              }}
            >
              {(field) => (
                <DelayField field={field} id="settings-max" label="Máximo" />
              )}
            </form.Field>
          </div>
          <form.Subscribe
            selector={(s) => ({ min: s.values.min, max: s.values.max })}
          >
            {({ min, max }) => {
              const minN = Number(min) * 60;
              const maxN = Number(max) * 60;
              const ok =
                Number.isFinite(minN) && Number.isFinite(maxN) && maxN >= minN;
              return (
                <p className="text-xs text-muted-foreground">
                  {ok
                    ? `Cada envio sai ${fmtMin(minN)}–${fmtMin(maxN)} após o anterior.`
                    : "Defina um intervalo válido (máx ≥ mín)."}
                </p>
              );
            }}
          </form.Subscribe>
        </div>
      </Panel>

      <Panel
        title="Mensagem"
        hint={
          <>
            Uma linha some sozinha quando seu único campo fica vazio (ex.: sem
            cupom). O <span className="font-mono">{"{link}"}</span> é
            obrigatório — é o que monetiza.
          </>
        }
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 lg:min-w-0">
            <form.Field
              name="template"
              validators={{
                onChange: ({ value }) =>
                  value.includes("{link}")
                    ? undefined
                    : "O template precisa conter {link}.",
              }}
            >
              {(field) => (
                <>
                  <div className="flex flex-wrap gap-2">
                    {PLACEHOLDERS.map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          insertPlaceholder(field.state.value, p.key)
                        }
                        title={`Inserir ${p.desc}`}
                        className="font-mono text-primary"
                      >
                        {p.key}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    ref={ref}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={9}
                    className="resize-y font-mono"
                  />
                </>
              )}
            </form.Field>
          </div>

          <div className="lg:w-80">
            <form.Subscribe selector={(s) => s.values.template}>
              {(template) => <PreviewBubble text={renderSample(template)} />}
            </form.Subscribe>
          </div>
        </div>
      </Panel>

      <form.Subscribe selector={(s) => s.values.template.includes("{link}")}>
        {(hasLink) =>
          hasLink ? null : (
            <ErrorNote>
              O template precisa conter {"{link}"} — senão a oferta sai sem o
              link de afiliado.
            </ErrorNote>
          )
        }
      </form.Subscribe>

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            <FloppyDiskIcon />
            Salvar configurações
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
