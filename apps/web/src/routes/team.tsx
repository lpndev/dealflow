import { TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Empty, ErrorNote, InviteMember, Panel } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errMsg, organization, unwrapAuth, useSession } from "@/lib";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Publisher",
};

export function Team() {
  const qc = useQueryClient();
  const { data: session } = useSession();

  const { data, error } = useQuery({
    queryKey: ["members"],
    queryFn: () => unwrapAuth(organization.listMembers()),
  });
  const members = data?.members ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["members"] });

  const updateRole = useMutation({
    mutationFn: (v: { memberId: string; role: "admin" | "member" }) =>
      unwrapAuth(organization.updateMemberRole(v)),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, "falha ao mudar papel")),
  });

  const remove = useMutation({
    mutationFn: (memberIdOrEmail: string) =>
      unwrapAuth(organization.removeMember({ memberIdOrEmail })),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, "falha ao remover membro")),
  });

  return (
    <div className="flex flex-col gap-8">
      <Panel title="Membros" hint="Quem tem acesso a este workspace.">
        {error && <ErrorNote>{error.message}</ErrorNote>}
        {members.length === 0 ? (
          <Empty>Nenhum membro ainda.</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => {
              const isSelf = m.userId === session?.user.id;
              const isOwner = m.role === "owner";
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-4 border bg-card px-4 py-2 text-xs"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-foreground">
                      {m.user.name || m.user.email}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {m.user.email}
                    </span>
                  </div>
                  {isOwner ? (
                    <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="sm">
                            {ROLE_LABEL[m.role] ?? m.role}
                          </Button>
                        }
                      />
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() =>
                            updateRole.mutate({
                              memberId: m.id,
                              role: "admin",
                            })
                          }
                        >
                          Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateRole.mutate({
                              memberId: m.id,
                              role: "member",
                            })
                          }
                        >
                          Publisher
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Remover membro"
                    aria-label="Remover membro"
                    disabled={isOwner || isSelf}
                    onClick={() => remove.mutate(m.id)}
                  >
                    <TrashIcon />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <InviteMember />
    </div>
  );
}
