# Dealflow

Sistema operacional de ofertas para grupos de WhatsApp. Transforma o processo
manual de preparar e enviar uma oferta (abrir marketplace, copiar dados, montar
mensagem, abrir WhatsApp, enviar N vezes) em **colar → revisar → enviar**.

O pipeline conceitual:

```
Signal → Product → DealSnapshot → AffiliateLink → Publication → Delivery
```

## Stack

- **Monorepo:** Bun workspaces
- **Web:** React + Vite + Tailwind CSS (`apps/web`)
- **API:** Hono + Bun (`apps/api`)
- **Qualidade:** TypeScript strict, ESLint, Prettier, `bun test`

DB (SQLite + Drizzle), auth (Better Auth) e o gateway de WhatsApp entram nos
slices que os usam — ainda não fazem parte desta fundação.

## Rodar

```sh
bun install
bun run dev        # sobe web (vite) + api (porta 3001)
```

## Qualidade

```sh
bun run lint
bun run typecheck
bun test
bun run format
```

## Estrutura

```
apps/
  web/   React + Vite + Tailwind
  api/   Hono + Bun
```
