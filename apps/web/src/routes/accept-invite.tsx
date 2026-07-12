import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { organization, useSession } from "@/lib";

export function AcceptInvite() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (isPending || !session || !id || started) return;
    setStarted(true);
    (async () => {
      const accepted = await organization.acceptInvitation({
        invitationId: id,
      });
      if (accepted.error || !accepted.data) {
        setError(accepted.error?.message ?? "Convite inválido ou expirado.");
        return;
      }
      const { error: setActiveError } = await organization.setActive({
        organizationId: accepted.data.invitation.organizationId,
      });
      if (setActiveError) {
        setError(setActiveError.message ?? "Falha ao ativar workspace.");
        return;
      }
      toast.success("Convite aceito — bem-vindo ao workspace.");
      navigate("/", { replace: true });
    })();
  }, [isPending, session, id, started, navigate]);

  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Faça login para aceitar o convite</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")}>Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {error ? "Não foi possível aceitar" : "Aceitando convite…"}
          </CardTitle>
        </CardHeader>
        {error && (
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-destructive">{error}</p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
