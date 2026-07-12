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
import {
  errMsg,
  organization,
  ROLE_LABEL,
  roleRank,
  unwrapAuth,
  useActiveRole,
  useSession,
} from "@/lib";

const ASSIGNABLE_ROLES = ["owner", "admin", "member"] as const;

export function Team() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const viewerRole = useActiveRole();
  const viewerRank = roleRank(viewerRole);
  const canAssignRoles = viewerRole === "owner";

  const { data, error } = useQuery({
    queryKey: ["members"],
    queryFn: () => unwrapAuth(organization.listMembers()),
  });
  const members = data?.members ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["members"] });

  const updateRole = useMutation({
    mutationFn: (v: { memberId: string; role: string }) =>
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
              const canManage = viewerRank > roleRank(m.role);
              const showRoleMenu = canAssignRoles && !isSelf;
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
                  {showRoleMenu ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="sm">
                            {ROLE_LABEL[m.role] ?? m.role}
                          </Button>
                        }
                      />
                      <DropdownMenuContent>
                        {ASSIGNABLE_ROLES.filter((r) => r !== m.role).map(
                          (r) => (
                            <DropdownMenuItem
                              key={r}
                              onClick={() =>
                                updateRole.mutate({ memberId: m.id, role: r })
                              }
                            >
                              {r === "owner" ? "Tornar dono" : ROLE_LABEL[r]}
                            </DropdownMenuItem>
                          ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge variant="secondary">
                      {ROLE_LABEL[m.role] ?? m.role}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Remover membro"
                    aria-label="Remover membro"
                    disabled={!canManage}
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
