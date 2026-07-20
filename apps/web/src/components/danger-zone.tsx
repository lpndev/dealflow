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
} from "@dealflow/ui/alert-dialog";
import { Button } from "@dealflow/ui/button";
import { Input } from "@dealflow/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components";
import {
  apiDelete,
  apiPost,
  authClient,
  errMsg,
  organization,
  useActiveRole,
  useCanManage,
  useOrganizations,
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
}: Readonly<DangerActionProps>) {
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
          {(confirmWord || password) && (
            <Input
              autoFocus
              type={password ? "password" : "text"}
              placeholder={password ? "Sua senha" : confirmWord}
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
  window.location.assign("/");
}

export function DangerZone() {
  const { data: session } = useSession();
  const isOwner = useActiveRole() === "owner";
  const canManage = useCanManage();

  const { data: orgs } = useOrganizations();
  const activeName = orgs?.find(
    (o) => o.id === session?.session.activeOrganizationId,
  )?.name;

  return (
    <Panel
      title="Zona de perigo"
      hint="Ações irreversíveis. O login do Mercado Livre no navegador (e a config da extensão) não são apagados aqui — remova-os no próprio navegador."
    >
      <div className="flex flex-col gap-3">
        {canManage && (
          <DangerAction
            title="Revogar todas as chaves de API"
            description="Invalida todas as chaves deste workspace. A extensão precisará de uma nova."
            actionLabel="Revogar todas"
            onConfirm={async () => {
              await apiDelete("/api-keys");
              void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
              toast.success("Chaves revogadas.");
            }}
          />
        )}

        {isOwner && (
          <DangerAction
            title="Excluir este workspace"
            description="Apaga o workspace e todos os seus dados (ofertas, fila, destinos, chaves) e desconecta o WhatsApp dele."
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
          description="Apaga todos os workspaces que você é dono (dados, chaves e sessões de WhatsApp). Sua conta é mantida."
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
            const email = session?.user.email;
            if (!email) throw new Error("sessão inválida");
            const check = await authClient.signIn.email({
              email,
              password: pw,
            });
            if (check.error) throw new Error("senha incorreta");
            await apiPost("/workspace/reset", {});
            const { error } = await authClient.deleteUser({ password: pw });
            if (error)
              throw new Error(error.message ?? "falha ao excluir conta");
            window.location.assign("/signup");
          }}
        />
      </div>
    </Panel>
  );
}
