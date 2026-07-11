import { EyeIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { Panel, PreviewBubble } from "@/components";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { type Form } from "@/types";

export function ReviewPanel(props: {
  form: Form;
  onChange: (field: keyof Form, value: string) => void;
  onPreview: () => void;
  onSave: () => void;
  preview: string | null;
  ready: boolean;
  needsAffiliate: boolean;
  needsPrice: boolean;
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
          <Field>
            <FieldLabel htmlFor="review-title">Título</FieldLabel>
            <Input
              id="review-title"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
            />
          </Field>
          <div className="flex gap-4 *:flex-1">
            <Field>
              <FieldLabel htmlFor="review-original">Preço De</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="review-original"
                  className="font-mono"
                  value={form.originalPrice}
                  onChange={(e) => onChange("originalPrice", e.target.value)}
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="review-current">Preço Por</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="review-current"
                  className="font-mono"
                  value={form.currentPrice}
                  onChange={(e) => onChange("currentPrice", e.target.value)}
                />
              </InputGroup>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="review-coupon">Cupom</FieldLabel>
            <Input
              id="review-coupon"
              className="font-mono"
              value={form.coupon}
              onChange={(e) => onChange("coupon", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="review-image">Imagem (URL)</FieldLabel>
            <Input
              id="review-image"
              className="font-mono"
              value={form.imageUrl}
              onChange={(e) => onChange("imageUrl", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="review-affiliate">Link afiliado</FieldLabel>
            <Input
              id="review-affiliate"
              className="font-mono"
              value={form.affiliateUrl}
              onChange={(e) => onChange("affiliateUrl", e.target.value)}
            />
          </Field>
          {(props.needsAffiliate || props.needsPrice) && (
            <div
              className={cn(
                "flex flex-col gap-2 border px-4 py-4 text-xs",
                props.needsAffiliate
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <p>
                {props.needsAffiliate
                  ? "Falta o seu link de afiliado — nunca publique com o link de outra pessoa. Gere o seu abaixo (abre o produto no ML e traz o link e o preço de volta automático)."
                  : "Faltou o preço — o ML bloqueia a leitura fora da sua sessão. Abra no ML pra puxar o preço real (o mesmo que o comprador vê no seu link)."}
              </p>
              <Button variant="outline" size="sm" onClick={props.onGenerate}>
                {props.needsAffiliate
                  ? "Abrir no ML e gerar meu link"
                  : "Abrir no ML e atualizar preço"}
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
