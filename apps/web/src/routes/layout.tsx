import {
  ClockCounterClockwiseIcon,
  ClockIcon,
  GearIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { NavLink, Outlet } from "react-router";
import { ModeToggle, WhatsAppStatus } from "@/components";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/", label: "Nova oferta", icon: TagIcon, end: true },
  { to: "/queue", label: "Fila", icon: ClockIcon, end: false },
  {
    to: "/history",
    label: "Histórico",
    icon: ClockCounterClockwiseIcon,
    end: false,
  },
  { to: "/settings", label: "Config", icon: GearIcon, end: false },
];

export function Layout() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-foreground">
              Dealflow
            </span>
            <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              dispatch
            </span>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppStatus />
            <ModeToggle />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 px-6 lg:px-8">
          {NAV.map((n) => (
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
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
