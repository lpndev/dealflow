import { BuildingsIcon, CaretDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errMsg, organization, useSession } from "@/lib";
import { queryClient } from "@/lib/query";

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const { data: orgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => (await organization.list()).data ?? [],
    enabled: !!session,
  });

  if (!orgs || orgs.length === 0) return null;

  const active = orgs.find(
    (o) => o.id === session?.session.activeOrganizationId,
  );

  if (orgs.length === 1) {
    return (
      <span className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
        <BuildingsIcon className="size-4" />
        {active?.name ?? orgs[0].name}
      </span>
    );
  }

  async function switchTo(organizationId: string) {
    const { error } = await organization.setActive({ organizationId });
    if (error) {
      toast.error(errMsg(error, "falha ao trocar de workspace"));
      return;
    }
    queryClient.clear();
    window.location.assign("/");
  }

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
