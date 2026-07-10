import {
  ClockCounterClockwiseIcon,
  ClockIcon,
  GearIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { ModeToggle, WhatsAppStatus } from "@/components";
import { ThemeProvider } from "@/components/theme-provider";
import { HistoryTab, NewOffer, QueueTab, SettingsTab } from "@/tabs";

const TABS = [
  { id: "new", label: "Nova oferta", icon: TagIcon },
  { id: "queue", label: "Fila", icon: ClockIcon },
  { id: "history", label: "Histórico", icon: ClockCounterClockwiseIcon },
  { id: "settings", label: "Config", icon: GearIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("new");
  const [refreshKey, setRefreshKey] = useState(0);

  function goQueue() {
    setRefreshKey((k) => k + 1);
    setTab("queue");
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
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
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
          {tab === "new" && <NewOffer onQueued={goQueue} />}
          {tab === "queue" && <QueueTab refreshKey={refreshKey} />}
          {tab === "history" && <HistoryTab refreshKey={refreshKey} />}
          {tab === "settings" && <SettingsTab />}
        </main>
      </div>
    </ThemeProvider>
  );
}
