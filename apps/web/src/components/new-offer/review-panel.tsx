import { EyeIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { Field, Panel, PreviewBubble } from "@/components";
import { Button } from "@/components/ui/button";
import { type Form } from "@/types";

export function ReviewPanel(props: {
  form: Form;
  onChange: (field: keyof Form, value: string) => void;
  onPreview: () => void;
  onSave: () => void;
  preview: string | null;
  ready: boolean;
  needsAffiliate: boolean;
  onGenerate: () => void;
}) {
  const { form, onChange } = props;
  return (
    <Panel
      title="Revisar"
      eyebrow="02"
      hint="O operador decide. Ajuste antes de publicar."
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 lg:min-w-0">
          <Field
            label="Título"
            value={form.title}
            onChange={(v) => onChange("title", v)}
          />
          <div className="flex gap-4 *:flex-1">
            <Field
              label="Preço De"
              mono
              prefix="R$"
              value={form.originalPrice}
              onChange={(v) => onChange("originalPrice", v)}
            />
            <Field
              label="Preço Por"
              mono
              prefix="R$"
              value={form.currentPrice}
              onChange={(v) => onChange("currentPrice", v)}
            />
          </div>
          <Field
            label="Cupom"
            mono
            value={form.coupon}
            onChange={(v) => onChange("coupon", v)}
          />
          <Field
            label="Imagem (URL)"
            mono
            value={form.imageUrl}
            onChange={(v) => onChange("imageUrl", v)}
          />
          <Field
            label="Link afiliado"
            mono
            hint="Nosso link — é o que monetiza"
            value={form.affiliateUrl}
            onChange={(v) => onChange("affiliateUrl", v)}
          />
          {props.needsAffiliate && (
            <div className="flex flex-col gap-2 border border-destructive/40 bg-destructive/10 px-4 py-4 text-xs text-destructive">
              <p>
                Falta o seu link de afiliado — nunca publique com o link de
                outra pessoa. Gere o seu abaixo (abre o produto no ML e traz o
                link de volta automático).
              </p>
              <Button variant="outline" size="sm" onClick={props.onGenerate}>
                Abrir no ML e gerar meu link
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={props.onPreview}>
              <EyeIcon />
              Pré-visualizar
            </Button>
            <Button size="sm" onClick={props.onSave}>
              <FloppyDiskIcon />
              Salvar publicação
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:w-80">
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt=""
              className="max-h-52 w-full border bg-muted object-contain p-2"
            />
          )}
          {props.preview && (
            <PreviewBubble text={props.preview} ready={props.ready} />
          )}
        </div>
      </div>
    </Panel>
  );
}
