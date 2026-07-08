# Dealflow

Sistema operacional de ofertas para grupos de WhatsApp, operado por uma pessoa
física. Resolve uma dor real: hoje preparar e enviar uma oferta é manual (abrir
marketplace, copiar dados, montar mensagem, abrir WhatsApp, repetir por grupo).
O objetivo é reduzir isso a **colar → revisar → enviar**.

Não é "bot de WhatsApp", "scraper" nem "automação de afiliados". É um sistema de
ofertas. O operador continua no loop: a automação assiste, o humano decide.

## Pipeline e domínio

```
Signal → Product → DealSnapshot → AffiliateLink → Publication → Delivery
```

- **Signal** — algo observado (URL colada, mensagem de concorrente). Sinal, não
  fonte de verdade. Nunca copiar mensagem e trocar URL: extrair o produto.
- **Product** — identidade estável (provider + externalId).
- **DealSnapshot** — observação de uma oferta num instante (preços, cupom).
  Produto ≠ oferta.
- **AffiliateLink** — nosso link de monetização. No MVP é entrada manual.
- **Publication** — mensagem renderizada pronta. Uma vez enviada, imutável.
- **Delivery** — envio de uma Publication a um Destination.

Use esse vocabulário de forma consistente.

## Invariantes revenue-critical (protegidas por teste)

- Publication nunca reutiliza o link externo do Signal — usa nosso AffiliateLink.
- Publication não é enviada sem AffiliateLink.
- `unique(publicationId, destinationId)` — sem envio duplicado ao mesmo destino.
- Retry não duplica delivery já enviada.
- Em erro financeiro, fail closed: na dúvida, não enviar.

## Restrições fundamentais (arquiteturais)

- **CPF, sem CNPJ** — nada de Official Business Account, Meta verification ou
  APIs business-only. Conta comum de ML e WhatsApp.
- **Custo zero no MVP** — 100% local. Sem VPS, banco gerenciado, Redis, filas,
  browser cloud, SaaS pago.
- **Um operador, uma máquina.** Resolver esse caso antes de qualquer escala.

## Stack

- **Monorepo:** Bun workspaces (`apps/*`)
- **Web:** React + Vite + Tailwind v4 (`@tailwindcss/vite`) — `apps/web`
- **API:** Hono + Bun (porta 3001) — `apps/api`
- **Qualidade:** TypeScript strict, ESLint (flat), Prettier, `bun test`

Fronteiras previstas (interface só quando separa dependência externa real):
`ProductSource`, `AffiliateLinkProvider`, `MessagingProvider`.

## Estado atual

Fundação + Slice 1 (importar URL) prontos. `apps/web` e `apps/api` sobem
localmente; lint, typecheck, test e format funcionam.

Slice 1: `POST /deals/import { input }` → extrai URLs → normaliza → busca o HTML
da página ML → parseia JSON-LD (fallback Open Graph) → devolve um `ExtractedDeal`
editável. Sem persistência ainda. Web: colar → Importar → formulário editável.

Nota ML: de IP de datacenter o fetch simples cai no anti-bot ("negative_traffic")
e não recebe JSON-LD; de IP residencial/navegador real costuma funcionar. Quando
falha, o formulário continua editável (preenchimento manual). O caminho confiável
futuro é a extensão de navegador (§24), não guerra anti-bot.

Adiado até o slice que usa (nada de decoração):

- **SQLite + Drizzle** → Slice 2 (ao persistir Publication/DealSnapshot).
- **Better Auth** → quando existir rota protegida.
- **`apps/wa-gateway`** (Baileys isolado) → Slice 3.

Roadmap: S1 importar URL ✅ → S2 criar publicação → S3 WhatsApp → S4 importar
mensagem → S5 múltiplos grupos.

## Arquitetura

- **Vertical Slice Architecture.** Organize por feature/caso de uso, não por
  camada. Ex.: `features/deals/import/{route,schema,use-case,use-case.test}.ts`.
  Nada de `controllers/`, `services/`, `repositories/`, `models/`.
- **DDD pragmático.** Vocabulário, fronteiras e invariantes — não pastas
  cerimoniais.
- **TDD nas invariantes caras** (parse, URL, preços, dedupe, template, affiliate
  link, idempotência de delivery). Não busque coverage, busque confiança.
- **Sem repositório genérico.** Operações específicas: `findProductByExternalId`,
  `insertDealSnapshot`, `createDeliveries`, `markDeliverySent`.
- Adapters isolados; detalhes externos (JID, `@g.us`, Baileys, seletores DOM)
  nunca vazam para o domínio.

## Filosofia (ponytail)

Simples não é incompleto. Complexidade se conquista pelo problema. Antes de
adicionar algo, pergunte: qual problema concreto isto resolve **agora**? Resposta
vaga = não adiciona. Nada de over-engineering (filas, microservices, DI
framework, interfaces com uma implementação sem fronteira real). Ordem de
prioridade: utilidade real → correção → simplicidade → velocidade de iteração →
extensibilidade necessária.

Antes de implementar: entenda o fluxo → menor vertical slice → invariantes caras
→ testes onde importam → caminho mais direto → rode test/lint/typecheck → remova
o que sobra.

## Convenções do projeto

- **Testes** ficam em `tests/` espelhando `src/`, não colocados. Ex.:
  `apps/api/tests/app.test.ts`.
- **Path alias** `@/*` → `src/*` (tsconfig + alias no Vite). Evite `../../`.
- **Sem comentários** no código. Nomes explícitos falam por si.
- **Prettier** manda na formatação; **ESLint** na qualidade (não acoplados).
- **Commits** em inglês, minúsculos, uma linha, poucas palavras, convencionais
  (`feat:`, `chore:`, `docs:`, `fix:`...). Ex.: `feat: add web app`. Sem trailer
  `Co-Authored-By`.
- Mudanças pequenas e executáveis. Sem scaffold vazio antes de comportamento.

## Comandos

```sh
bun install
bun run dev        # web (vite) + api (:3001)
bun run lint
bun run typecheck
bun test
bun run format
```
