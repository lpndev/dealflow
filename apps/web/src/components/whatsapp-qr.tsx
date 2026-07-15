export function WhatsAppQr({ qr }: { qr: string }) {
  return (
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
  );
}
