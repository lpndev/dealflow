import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiDelete,
  apiPost,
  authClient,
  errMsg,
  organization,
  useActiveRole,
  useSession,
} from "@/lib";
import { queryClient } from "@/lib/query";

type DangerActionProps = {
  title: string;
  description: string;
  actionLabel: string;
  confirmWord?: string;
  password?: boolean;
  onConfirm: (input: string) => Promise<void>;
};

function DangerAction({
  title,
  description,
  actionLabel,
  confirmWord,
  password,
  onConfirm,
}: DangerActionProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const ready =
    (!confirmWord || value === confirmWord) && (!password || value.length > 0);

  async function handle() {
    setBusy(true);
    try {
      await onConfirm(value);
    } catch (e) {
      toast.error(errMsg(e, "falha na operação"));
      setBusy(false);
      return;
    }
    setBusy(false);
    setOpen(false);
    setValue("");
  }

  return (
    <div className="flex items-center justify-between gap-4 border bg-card px-4 py-3 text-xs">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground">{description}</span>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setValue("");
        }}
      >
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm" className="shrink-0">
              {actionLabel}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmWord && (
            <Input
              autoFocus
              placeholder={confirmWord}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
          {password && (
            <Input
              autoFocus
              type="password"
              placeholder="Sua senha"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!ready || busy}
              onClick={(e) => {
                e.preventDefault();
                void handle();
              }}
            >
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

async function reloadIntoRemaining() {
  const remaining = (await organization.list()).data ?? [];
  if (remaining[0]) {
    await organization.setActive({ organizationId: remaining[0].id });
  }
  queryClient.clear();
  window.location.assign("/");
}

export function DangerZone() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = useActiveRole();
  const isOwner = role === "owner";
  const canManage = role === "owner" || role === "admin";

  const { data: orgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => (await organization.list()).data ?? [],
    enabled: !!session,
  });
  const activeName = orgs?.find(
    (o) => o.id === session?.session.activeOrganizationId,
  )?.name;

  return (
    <Panel
      title="Zona de perigo"
      hint="Ações irreversíveis. A sessão do WhatsApp e o login do Mercado Livre no navegador (e a config da extensão) não são apagados aqui — remova-os no próprio navegador."
    >
      <div className="flex flex-col gap-3">
        {canManage && (
          <DangerAction
            title="Revogar todas as chaves de API"
            description="Invalida todas as chaves deste workspace. A extensão precisará de uma nova."
            actionLabel="Revogar todas"
            onConfirm={async () => {
              await apiDelete("/api-keys");
              qc.invalidateQueries({ queryKey: ["api-keys"] });
              toast.success("Chaves revogadas.");
            }}
          />
        )}

        {isOwner && (
          <DangerAction
            title="Excluir este workspace"
            description="Apaga o workspace e todos os seus dados (ofertas, fila, destinos, chaves)."
            actionLabel="Excluir workspace"
            confirmWord={activeName}
            onConfirm={async () => {
              await apiDelete("/workspace");
              await reloadIntoRemaining();
            }}
          />
        )}

        <DangerAction
          title="Resetar tudo"
          description="Apaga todos os seus workspaces e dados, revoga as chaves e desconecta o WhatsApp. Sua conta é mantida."
          actionLabel="Resetar tudo"
          confirmWord="RESETAR"
          onConfirm={async () => {
            await apiPost("/workspace/reset", {});
            await reloadIntoRemaining();
          }}
        />

        <DangerAction
          title="Excluir minha conta"
          description="Remove sua conta e todos os workspaces que você é dono. Não dá para desfazer."
          actionLabel="Excluir conta"
          password
          onConfirm={async (pw) => {
            await apiPost("/workspace/reset", {});
            const { error } = await authClient.deleteUser({ password: pw });
            if (error)
              throw new Error(error.message ?? "falha ao excluir conta");
            queryClient.clear();
            window.location.assign("/signup");
          }}
        />
      </div>
    </Panel>
  );
}
