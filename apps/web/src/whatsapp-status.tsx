import { useEffect, useState } from "react";
import { GATEWAY } from "./lib";

const CONNECTION_LABEL: Record<string, string> = {
  open: "conectado",
  connecting: "conectando…",
  close: "desconectado",
  desconhecido: "verificando…",
  "gateway offline": "gateway offline",
};

export function WhatsAppStatus() {
  const [connection, setConnection] = useState("desconhecido");
  const [qr, setQr] = useState<string | null>(null);
  const [openQr, setOpenQr] = useState(false);

  async function refresh() {
    try {
      const session = await fetch(`${GATEWAY}/session`).then((r) => r.json());
      setConnection(session.connection);
      if (session.hasQr) {
        const data = await fetch(`${GATEWAY}/session/qr`).then((r) => r.json());
        setQr(data.qr ?? null);
      } else {
        setQr(null);
      }
    } catch {
      setConnection("gateway offline");
      setQr(null);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (qr) setOpenQr(true);
    if (connection === "open") setOpenQr(false);
  }, [qr, connection]);

  const connected = connection === "open";
  const label = CONNECTION_LABEL[connection] ?? connection;

  return (
    <div className="relative">
      <button
        onClick={() => qr && setOpenQr((v) => !v)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          connected
            ? "border-go/40 bg-go/10 text-go"
            : qr
              ? "border-gold/50 bg-gold/10 text-gold hover:brightness-110"
              : "border-line bg-panel text-muted"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-go pulse-go" : qr ? "bg-gold" : "bg-muted"
          }`}
        />
        WhatsApp: {label}
        {qr && !connected && <span className="text-gold">· ver QR</span>}
      </button>

      {qr && openQr && !connected && (
        <div className="rise absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-panel p-4 shadow-2xl">
          <p className="mb-2 text-xs text-muted">
            No WhatsApp:{" "}
            <span className="text-text">
              Aparelhos conectados → Conectar um aparelho
            </span>
            , e aponte para o código.
          </p>
          <img
            src={qr}
            alt="QR de conexão do WhatsApp"
            className="w-full rounded-lg bg-white p-2"
          />
        </div>
      )}
    </div>
  );
}
