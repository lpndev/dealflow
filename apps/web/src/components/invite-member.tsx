import { Badge } from "@dealflow/ui/badge";
import { Button } from "@dealflow/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dealflow/ui/dropdown-menu";
import { Field, FieldLabel } from "@dealflow/ui/field";
import { Input } from "@dealflow/ui/input";
import {
  CheckIcon,
  CopyIcon,
  UserPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, ErrorNote, Panel } from "@/components";
import {
  copyWithToast,
  errMsg,
  organization,
  ROLE_LABEL,
  unwrapAuth,
  useActiveRole,
} from "@/lib";

type InviteRole = "admin" | "member";

function inviteLinkFor(id: string) {
  return `${window.location.origin}/accept-invite/${id}`;
}

function copyLink(link: string) {
  copyWithToast(link, "Link copiado.");
}

export function InviteMember() {
  const qc = useQueryClient();
  const viewerRole = useActiveRole();
  const inviteRoles: InviteRole[] =
    viewerRole === "owner" ? ["admin", "member"] : ["member"];
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [lastLink, setLastLink] = useState<string | null>(null);

  const { data, error } = useQuery({
    queryKey: ["invitations"],
    queryFn: () => unwrapAuth(organization.listInvitations()),
  });
  const pending = (data ?? []).filter((i) => i.status === "pending");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["invitations"] });

  const invite = useMutation({
    mutationFn: (v: { email: string; role: InviteRole }) =>
      unwrapAuth(organization.inviteMember(v)),
    onSuccess: (invitation) => {
      setLastLink(inviteLinkFor(invitation.id));
      setEmail("");
      invalidate();
      toast.success("Convite criado — copie o link para enviar.");
    },
    onError: (e) => toast.error(errMsg(e, "falha ao convidar")),
  });

  const cancel = useMutation({
    mutationFn: (invitationId: string) =>
      unwrapAuth(organization.cancelInvitation({ invitationId })),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, "falha ao cancelar convite")),
  });

  return (
    <Panel
      title="Convidar"
      hint="Sem envio de e-mail no MVP: copie o link gerado e mande você mesmo (WhatsApp, e-mail etc)."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          invite.mutate({ email, role });
        }}
        className="flex flex-col gap-4"
      >
        <Field>
          <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-2">
          {inviteRoles.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline">
                    {ROLE_LABEL[role]}
                  </Button>
                }
              />
              <DropdownMenuContent>
                {inviteRoles.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                    {r === role && <CheckIcon />}
                    {ROLE_LABEL[r]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
          )}
          <Button type="submit" disabled={invite.isPending}>
            <UserPlusIcon />
            Convidar
          </Button>
        </div>
      </form>

      {lastLink && (
        <Field>
          <FieldLabel>Link do convite</FieldLabel>
          <div className="flex gap-2">
            <Input readOnly value={lastLink} className="font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Copiar link"
              aria-label="Copiar link"
              onClick={() => copyLink(lastLink)}
            >
              <CopyIcon />
            </Button>
          </div>
        </Field>
      )}

      {error && <ErrorNote>{error.message}</ErrorNote>}
      {pending.length === 0 ? (
        <Empty>Nenhum convite pendente.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-4 border bg-card px-4 py-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{inv.email}</span>
              <span className="text-muted-foreground">
                {ROLE_LABEL[inv.role] ?? inv.role}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title="Copiar link"
                  aria-label="Copiar link"
                  onClick={() => copyLink(inviteLinkFor(inv.id))}
                >
                  <CopyIcon />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  title="Cancelar convite"
                  aria-label="Cancelar convite"
                  onClick={() => cancel.mutate(inv.id)}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
