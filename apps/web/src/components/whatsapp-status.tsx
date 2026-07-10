import { QrCodeIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { usePolling } from "@/hooks";
import { connectionLabel, fetchSession } from "@/lib";

export function WhatsAppStatus() {
  const [connection, setConnection] = useState("desconhecido");
  const [qr, setQr] = useState<string | null>(null);
  const [openQr, setOpenQr] = useState(false);

  async function refresh() {
    const session = await fetchSession();
    setConnection(session.connection);
    setQr(session.qr);
  }

  usePolling(refresh, connection === "open" ? 20000 : 3000);

  useEffect(() => {
    if (qr) setOpenQr(true);
    if (connection === "open") setOpenQr(false);
  }, [qr, connection]);

  const connected = connection === "open";
  const label = connectionLabel(connection);

  return (
    <div className="relative">
      <button
        onClick={() => qr && setOpenQr((v) => !v)}
        className={`flex items-center gap-2 border px-4 py-2 text-xs font-medium transition-colors ${
          connected
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
            : qr
              ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border bg-card text-muted-foreground"
        }`}
      >
        <span
          className={`h-2 w-2 ${
            connected
              ? "animate-pulse bg-emerald-500"
              : qr
                ? "bg-primary"
                : "bg-muted-foreground"
          }`}
        />
        WhatsApp: {label}
        {qr && !connected && (
          <span className="flex items-center gap-1 text-primary">
            <QrCodeIcon className="size-3" />
            ver QR
          </span>
        )}
      </button>

      {qr && openQr && !connected && (
        <div className="absolute top-full right-0 z-20 flex w-64 flex-col gap-2 border bg-popover p-4 shadow-2xl">
          <p className="text-xs text-muted-foreground">
            No WhatsApp:{" "}
            <span className="text-foreground">
              Aparelhos conectados → Conectar um aparelho
            </span>
            , e aponte para o código.
          </p>
          <img
            src={qr}
            alt="QR de conexão do WhatsApp"
            className="w-full bg-white p-2"
          />
        </div>
      )}
    </div>
  );
}
