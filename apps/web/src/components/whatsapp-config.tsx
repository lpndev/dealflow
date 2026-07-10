import { useState } from "react";
import { Panel } from "@/components";
import { Button } from "@/components/ui/button";
import { usePolling } from "@/hooks";
import { connectionLabel, fetchSession, gatewayPost } from "@/lib";

export function WhatsAppConfig() {
  const [connection, setConnection] = useState("desconhecido");
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (busy) return;
    const session = await fetchSession();
    setConnection(session.connection);
    setQr(session.qr);
  }

  usePolling(refresh, connection === "open" ? 20000 : 3000);

  async function act(path: string) {
    setBusy(true);
    try {
      await gatewayPost(path);
    } catch {
      /* gateway offline — refresh will surface it */
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const connected = connection === "open";

  return (
    <Panel title="WhatsApp" hint="Conexão do número que envia as ofertas">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`h-2 w-2 ${
            connected
              ? "bg-emerald-500"
              : qr
                ? "bg-primary"
                : "bg-muted-foreground"
          }`}
        />
        <span className="text-foreground">{connectionLabel(connection)}</span>
      </div>

      {qr && !connected && (
        <div className="flex w-64 flex-col gap-2 border bg-card p-4">
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => act("/session/reconnect")}
        >
          Reconectar
        </Button>
        <Button
          variant="outline"
          disabled={busy || !connected}
          onClick={() => act("/session/end")}
        >
          Encerrar
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => act("/session/logout")}
        >
          Deslogar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="text-foreground">Encerrar</span> mantém a sessão
        (reconecta sem QR). <span className="text-foreground">Deslogar</span>{" "}
        apaga a sessão — o próximo login pede um QR novo.
      </p>
    </Panel>
  );
}
