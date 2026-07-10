import { useEffect, useState } from "react";
import { Empty, ErrorNote, GroupToggle, Panel } from "@/components";
import { apiGet, apiPatch } from "@/lib";
import { type Destination } from "@/types";

export function GroupsConfig() {
  const [groups, setGroups] = useState<Destination[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/destinations")
      .then((d) => setGroups(d.destinations ?? []))
      .catch((e) => setError(e.message));
  }, []);

  async function toggle(id: string, enabled: boolean) {
    setGroups((cur) => cur.map((g) => (g.id === id ? { ...g, enabled } : g)));
    try {
      const d = await apiPatch(`/destinations/${id}`, { enabled });
      setGroups(d.destinations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao salvar");
    }
  }

  return (
    <Panel
      title="Grupos padrão"
      hint="Os ativos já vêm marcados ao enviar uma oferta"
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      {groups.length === 0 ? (
        <Empty>Nenhum grupo ainda. Conecte o WhatsApp e sincronize.</Empty>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <GroupToggle
              key={g.id}
              name={g.name}
              checked={g.enabled}
              onCheckedChange={(checked) => toggle(g.id, checked)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
