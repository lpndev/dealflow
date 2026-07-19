import { Button } from "@dealflow/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dealflow/ui/dropdown-menu";
import { SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { signOut, useSession } from "@/lib";

export function UserMenu() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  if (!session) return null;

  async function handleSignOut() {
    await signOut();
    void navigate("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <UserCircleIcon className="size-5" />
            <span className="sr-only">Conta</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleSignOut()}
        >
          <SignOutIcon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
