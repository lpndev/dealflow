import { Button } from "@dealflow/ui/button";
import { Field, FieldLabel } from "@dealflow/ui/field";
import { Input } from "@dealflow/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@dealflow/ui/input-group";
import {
  ArrowClockwiseIcon,
  FloppyDiskIcon,
  HourglassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Panel, PreviewBubble } from "@/components";
import { type Form } from "@/types";

export function ReviewPanel(
  props: Readonly<{
    form: Form;
    onChange: (field: keyof Form, value: string) => void;
    onSave: () => void;
    preview: string | null;
    ready: boolean;
    loading: boolean;
    missingExtension: boolean;
    mintError: string | null;
    onRetryMint: () => void;
  }>,
) {
  const { form, onChange } = props;
  return (
    <Panel
      title="Revisar"
      eyebrow="02"
      hint="O operador decide. Ajuste antes de publicar."
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 lg:min-w-0">
          {props.loading && (
            <div className="flex items-center gap-2 border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <HourglassIcon className="size-4 animate-pulse" />
              Puxando preço e link do Mercado Livre pela extensão…
            </div>
          )}
          {props.mintError && (
            <div className="flex flex-col gap-2 border border-destructive/40 bg-destructive/10 px-4 py-4 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <WarningCircleIcon className="size-4 shrink-0" />
                <span>{props.mintError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={props.onRetryMint}
              >
                <ArrowClockwiseIcon />
                Tentar de novo
              </Button>
            </div>
          )}
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
          {props.missingExtension && (
            <div className="border border-border bg-muted/40 px-4 py-4 text-xs text-muted-foreground">
              Extensão do Dealflow não instalada — não dá pra puxar preço e link
              automaticamente. Instale a extensão para gerar o seu link na
              página do produto.
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={props.onSave}>
              <FloppyDiskIcon />
              Salvar publicação
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:w-80">
          {(props.preview || form.imageUrl) && (
            <PreviewBubble
              imageUrl={form.imageUrl}
              text={props.preview ?? undefined}
              ready={props.ready}
            />
          )}
        </div>
      </div>
    </Panel>
  );
}
