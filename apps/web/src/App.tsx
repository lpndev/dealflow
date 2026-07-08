import { useState } from "react";
import { WhatsAppStatus } from "./whatsapp-status";
import { NewOffer } from "./tabs/new-offer";
import { QueueTab, HistoryTab } from "./tabs/queue";
import { SettingsTab } from "./tabs/settings";

const TABS = [
  { id: "new", label: "Nova oferta" },
  { id: "queue", label: "Fila" },
  { id: "history", label: "Histórico" },
  { id: "settings", label: "Config" },
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
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 lg:px-8">
          <div className="flex items-baseline gap-2.5">
            <span className="text-base font-bold tracking-tight text-text">
              Dealflow
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              dispatch
            </span>
          </div>
          <WhatsAppStatus />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-5 lg:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? "border-gold text-text"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        {tab === "new" && <NewOffer onQueued={goQueue} />}
        {tab === "queue" && <QueueTab refreshKey={refreshKey} />}
        {tab === "history" && <HistoryTab refreshKey={refreshKey} />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}
