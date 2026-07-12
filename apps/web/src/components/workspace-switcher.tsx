import { BuildingsIcon, CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createWorkspace, errMsg, organization, useSession } from "@/lib";
import { queryClient } from "@/lib/query";

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: orgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => (await organization.list()).data ?? [],
    enabled: !!session,
  });

  if (!orgs) return null;

  const active = orgs.find(
    (o) => o.id === session?.session.activeOrganizationId,
  );

  async function switchTo(organizationId: string) {
    const { error } = await organization.setActive({ organizationId });
    if (error) {
      toast.error(error?.message ?? "falha ao trocar de workspace");
      return;
    }
    queryClient.clear();
    window.location.assign("/");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createWorkspace(name);
      queryClient.clear();
      window.location.assign("/");
    } catch (err) {
      toast.error(errMsg(err, "falha ao criar workspace"));
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm">
              <BuildingsIcon />
              {active?.name ?? "Workspace"}
              <CaretDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent>
          {orgs.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => switchTo(o.id)}>
              {o.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setName("");
              setCreating(true);
            }}
          >
            <PlusIcon />
            Novo workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="new-workspace-name">Nome</FieldLabel>
              <Input
                id="new-workspace-name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                }
              />
              <Button type="submit" disabled={busy || !name}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
