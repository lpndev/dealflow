import { CopyIcon, KeyIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, ErrorNote, Panel } from "@/components";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiDelete, apiGet, apiPost, errMsg, fmtTime } from "@/lib";
import { type ApiKeyInfo } from "@/types";

export function ApiKeysPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, error } = useQuery<ApiKeyInfo[]>({
    queryKey: ["api-keys"],
    queryFn: () => apiGet("/api-keys"),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["api-keys"] });

  const create = useMutation({
    mutationFn: (v: { name: string }) => apiPost("/api-keys", v),
    onSuccess: (created) => {
      setNewKey(created.key);
      setName("");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e, "falha ao gerar chave")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api-keys/${id}`),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, "falha ao revogar chave")),
  });

  return (
    <Panel
      title="Chaves de API"
      hint="Usadas pela extensão de captura para autenticar neste workspace."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name: name || "Extensão" });
        }}
        className="flex items-end gap-2"
      >
        <Field className="max-w-xs">
          <FieldLabel htmlFor="api-key-name">Nome</FieldLabel>
          <Input
            id="api-key-name"
            placeholder="Extensão"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={create.isPending}>
          <KeyIcon />
          Gerar chave
        </Button>
      </form>

      {newKey && (
        <div className="flex flex-col gap-2 border border-dashed p-4">
          <p className="text-xs text-muted-foreground">
            Copie agora — a chave não será mostrada de novo.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={newKey} className="font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Copiar chave"
              aria-label="Copiar chave"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast.success("Chave copiada.");
              }}
            >
              <CopyIcon />
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorNote>{error.message}</ErrorNote>}
      {(data ?? []).length === 0 ? (
        <Empty>Nenhuma chave gerada ainda.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {(data ?? []).map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-4 border bg-card px-4 py-2 text-xs"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-foreground">{k.name}</span>
                <span className="truncate font-mono text-muted-foreground">
                  {k.start ?? "····"}… · criada {fmtTime(k.createdAt)}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                title="Revogar chave"
                aria-label="Revogar chave"
                onClick={() => remove.mutate(k.id)}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
