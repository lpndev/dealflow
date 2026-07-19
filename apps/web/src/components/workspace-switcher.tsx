import { Button } from "@dealflow/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dealflow/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dealflow/ui/dropdown-menu";
import { Field, FieldLabel } from "@dealflow/ui/field";
import { Input } from "@dealflow/ui/input";
import { BuildingsIcon, CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import {
  createWorkspace,
  errMsg,
  organization,
  useOrganizations,
  useSession,
} from "@/lib";

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: orgs } = useOrganizations();

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
    window.location.assign("/");
  }

  async function handleCreate(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const field = new FormData(e.currentTarget).get("name");
    const name = typeof field === "string" ? field : "";
    setBusy(true);
    try {
      await createWorkspace(name);
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
            <Button variant="ghost" size="sm" className="min-w-0">
              <BuildingsIcon />
              <span className="max-w-28 truncate sm:max-w-40">
                {active?.name ?? "Workspace"}
              </span>
              <CaretDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent className="w-auto">
          {orgs.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => void switchTo(o.id)}>
              {o.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
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
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="flex flex-col gap-4"
          >
            <Field>
              <FieldLabel htmlFor="new-workspace-name">Nome</FieldLabel>
              <Input id="new-workspace-name" name="name" required autoFocus />
            </Field>
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                }
              />
              <Button type="submit" disabled={busy}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
