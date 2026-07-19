import { Button } from "@dealflow/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dealflow/ui/card";
import { Field, FieldError, FieldLabel } from "@dealflow/ui/field";
import { Input } from "@dealflow/ui/input";
import { useEffect, useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";
import { createWorkspace, errMsg, useSession } from "@/lib";

export function Onboarding() {
  const navigate = useNavigate();
  const { data, isPending } = useSession();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!data) {
      void navigate("/login", { replace: true });
      return;
    }
    if (data.session.activeOrganizationId) {
      void navigate("/", { replace: true });
    }
  }, [isPending, data, navigate]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createWorkspace(name);
      void navigate("/");
    } catch (err) {
      setError(errMsg(err, "Falha ao criar workspace."));
    } finally {
      setBusy(false);
    }
  }

  if (isPending || !data || data.session.activeOrganizationId) return null;

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crie seu workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="flex flex-col gap-4"
          >
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="onboarding-name">
                Nome do workspace
              </FieldLabel>
              <Input
                id="onboarding-name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Button type="submit" disabled={busy}>
              Criar workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
