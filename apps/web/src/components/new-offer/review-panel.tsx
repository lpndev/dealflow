import { type Form } from "@/types";
import { Button, Field, Panel, PreviewBubble } from "@/ui";

export function ReviewPanel(props: {
  form: Form;
  onChange: (field: keyof Form, value: string) => void;
  onPreview: () => void;
  onSave: () => void;
  preview: string | null;
  ready: boolean;
}) {
  const { form, onChange } = props;
  return (
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
            onChange={(v) => onChange("title", v)}
          />
          <div className="grid grid-cols-2 gap-3">
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
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={props.onPreview}>
              Pré-visualizar
            </Button>
            <Button size="sm" onClick={props.onSave}>
              Salvar publicação
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt=""
              className="max-h-52 w-full rounded-lg border border-line bg-inset object-contain p-2"
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
