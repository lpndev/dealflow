import { Button } from "@dealflow/ui/button";
import {
  ArrowsClockwiseIcon,
  PowerIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components";
import { WhatsAppQr } from "@/components/whatsapp-qr";
import { apiPost, connectionDot, connectionLabel } from "@/lib";
import { sessionQuery } from "@/lib/query";

export function WhatsAppConfig() {
  const qc = useQueryClient();
  const { data } = useQuery(sessionQuery);
  const connection = data?.connection ?? "desconhecido";
  const qr = data?.qr ?? null;

  const act = useMutation({
    mutationFn: (path: string) => apiPost(path, {}),
    onSettled: () => qc.invalidateQueries({ queryKey: ["wa-session"] }),
  });
  const busy = act.isPending;
  const connected = connection === "open";

  return (
    <Panel
      title="WhatsApp"
      hint={
        <>
          <span className="text-foreground">Reconectar</span> retoma a conexão.{" "}
          <span className="text-foreground">Encerrar</span> desconecta mas
          mantém a sessão (reconecta sem QR).{" "}
          <span className="text-foreground">Deslogar</span> apaga a sessão — o
          próximo login pede um QR novo.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className={`size-2 ${connectionDot(connected, qr)}`} />
          <span className="text-foreground">{connectionLabel(connection)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => act.mutate("/wa/connect")}
          >
            <ArrowsClockwiseIcon />
            Reconectar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !connected}
            onClick={() => act.mutate("/wa/end")}
          >
            <PowerIcon />
            Encerrar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => act.mutate("/wa/logout")}
          >
            <SignOutIcon />
            Deslogar
          </Button>
        </div>
      </div>

      {qr && !connected && (
        <div className="flex w-64 flex-col gap-2 border bg-card p-4">
          <WhatsAppQr qr={qr} />
        </div>
      )}
    </Panel>
  );
}
