import { Button } from "@dealflow/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dealflow/ui/dropdown-menu";
import { ModeToggle } from "@dealflow/ui/mode-toggle";
import { Toaster } from "@dealflow/ui/sonner";
import { TooltipProvider } from "@dealflow/ui/tooltip";
import {
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  GearIcon,
  ListIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { UserMenu, WhatsAppStatus, WorkspaceSwitcher } from "@/components";
import { useCanManage } from "@/lib";

const NAV = [
  { to: "/", label: "Início", icon: ChartBarIcon, end: true },
  { to: "/new", label: "Nova oferta", icon: TagIcon, end: false },
  { to: "/queue", label: "Fila", icon: ClockIcon, end: false },
  {
    to: "/history",
    label: "Histórico",
    icon: ClockCounterClockwiseIcon,
    end: false,
  },
  {
    to: "/team",
    label: "Equipe",
    icon: UsersIcon,
    end: false,
    adminOnly: true,
  },
  {
    to: "/settings",
    label: "Config",
    icon: GearIcon,
    end: false,
    adminOnly: true,
  },
];

type NavItem = (typeof NAV)[number];

function MobileNav({ items }: { items: NavItem[] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current =
    items.find((n) =>
      n.end ? pathname === n.to : pathname.startsWith(n.to) && n.to !== "/",
    ) ?? items[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ListIcon />
            {current.label}
          </Button>
        }
      />
      <DropdownMenuContent className="w-[calc(100vw-2rem)]">
        {items.map((n) => (
          <DropdownMenuItem key={n.to} onClick={() => navigate(n.to)}>
            <n.icon />
            {n.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout() {
  const canManage = useCanManage();
  const nav = NAV.filter((n) => !n.adminOnly || canManage);

  return (
    <TooltipProvider>
      <div className="min-h-full">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="text-base font-bold tracking-tight text-foreground"
              >
                Dealflow
              </Link>
              <WorkspaceSwitcher />
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <WhatsAppStatus />
              <ModeToggle />
              <UserMenu />
            </div>
          </div>
          <nav className="mx-auto hidden max-w-5xl gap-2 px-6 sm:flex lg:px-8">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <n.icon className="size-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 pb-3 sm:hidden">
            <MobileNav items={nav} />
          </div>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
