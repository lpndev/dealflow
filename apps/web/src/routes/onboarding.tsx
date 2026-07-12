import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { organization, useSession } from "@/lib";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Onboarding() {
  const navigate = useNavigate();
  const { data, isPending } = useSession();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!data) {
      navigate("/login", { replace: true });
      return;
    }
    if (data.session.activeOrganizationId) {
      navigate("/", { replace: true });
    }
  }, [isPending, data, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const baseSlug = slugify(name) || "workspace";
    let created = await organization.create({ name, slug: baseSlug });
    if (
      created.error &&
      created.error.code === "ORGANIZATION_SLUG_ALREADY_TAKEN"
    ) {
      const suffix = Math.random().toString(36).slice(2, 7);
      created = await organization.create({
        name,
        slug: `${baseSlug}-${suffix}`,
      });
    }
    if (created.error || !created.data) {
      setBusy(false);
      setError(created.error?.message ?? "Falha ao criar workspace.");
      return;
    }

    const { error: setActiveError } = await organization.setActive({
      organizationId: created.data.id,
    });
    setBusy(false);
    if (setActiveError) {
      setError(setActiveError.message ?? "Falha ao ativar workspace.");
      return;
    }
    navigate("/");
  }

  if (isPending || !data || data.session.activeOrganizationId) return null;

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crie seu workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
