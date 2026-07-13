import { WhatsappLogoIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { connectionDot, connectionLabel } from "@/lib";
import { sessionQuery } from "@/lib/query";

export function WhatsAppStatus() {
  const { data } = useQuery(sessionQuery);
  const connection = data?.connection ?? "desconhecido";
  const qr = data?.qr ?? null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (qr) setOpen(true);
    if (connection === "open") setOpen(false);
  }, [qr, connection]);

  const connected = connection === "open";
  const label = connectionLabel(connection);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`WhatsApp: ${label}`}>
            <span className="relative">
              <WhatsappLogoIcon className="size-5" />
              <span
                className={`absolute -top-0.5 -right-1 size-2 ${connectionDot(
                  connected,
                  qr,
                )} ${qr && !connected ? "animate-pulse" : ""}`}
              />
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="flex w-64 flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className={`size-2 ${connectionDot(connected, qr)}`} />
          <span className="text-foreground">WhatsApp: {label}</span>
        </div>
        {qr && !connected && (
          <>
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
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
