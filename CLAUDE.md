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

Fundação + Slice 1 (importar URL) + Slice 2 (criar publicação) + Slice 3
(WhatsApp) + Slice 4 (importar mensagem) prontos. `apps/web`, `apps/api` e
`apps/wa-gateway` sobem localmente; lint, typecheck, test e format funcionam.

Slice 1: `POST /deals/import { input }` → extrai URLs → normaliza → busca o HTML
da página ML → parseia JSON-LD (fallback Open Graph) → devolve um `ExtractedDeal`
editável. Web: colar → Importar → formulário editável.

Slice 4: o mesmo `POST /deals/import` já aceita a mensagem inteira de um
concorrente (o `extractUrls` do S1 acha a URL no texto). Além do produto (que vem
sempre do ML, nunca do texto), `extractMessageHints`
(`features/deals/import/message.ts`) lê do texto o cupom e os preços De/Por e
pré-preenche `coupon` + `price.original`/`current`. Hints da mensagem têm
precedência sobre o ML nos preços/cupom (o fetch do ML é instável e a mensagem é
a própria oferta a replicar); identidade do produto nunca. Operador revisa o form
editável antes de publicar. Coupon exige dígito ou caixa-alta (evita capturar
palavra solta). TDD do parser em `tests/features/deals/import/message.test.ts`.

Slice 2: `POST /publications/preview` (render puro) e `POST /publications`
(persiste `product` + `deal_snapshot` + `affiliate_link` + `publication`,
status `ready`). Template em `features/publications/render.ts`. Prices parseiam
no servidor (`parsePrice`: vírgula = decimal BRL; só ponto = decimal). Web: form →
Preview / Salvar publicação. Persistência: SQLite (`bun:sqlite`) + Drizzle,
migrations em `apps/api/drizzle/` (geradas por `bun run db:generate`), aplicadas no
boot. Sem auth ainda: `workspaceId` fixo em `DEFAULT_WORKSPACE_ID`.

Slice 3: `apps/wa-gateway` (porta 3002) isola o Baileys — sessão em `wa-auth/`
(`useMultiFileAuthState`), QR/estado via `connection.update`. API do gateway:
`GET /health|/session|/session/qr|/groups`, `POST /messages`. A API fala com ele
por HTTP atrás do `MessagingProvider` (`shared/messaging.ts`); o domínio só vê
`externalId` opaco (o JID `@g.us` nunca vaza). `POST /destinations/sync` importa
grupos; `POST /publications/:id/send { destinationIds }` cria `delivery` por
destino, envia sequencial (sem fila), marca `sent`/`failed`, e a publicação vira
`sent` quando todas passam. Web: painel WhatsApp (status + QR), sincronizar
grupos, selecionar destinos, Enviar, status por destino.

Invariantes cobertas por teste: publicação usa nosso `affiliateUrl` (nunca a
`sourceUrl`); rejeita afiliado ausente/inválido ou igual à origem; produto é
reusado entre snapshots; `unique(publicationId, destinationId)` (sem delivery
duplicada); retry não reenvia delivery já `sent`; falha marca `failed` e um
retry pode virar `sent`.

Nota ML: de IP de datacenter o fetch simples cai no anti-bot ("negative_traffic")
e não recebe JSON-LD; de IP residencial/navegador real costuma funcionar. Quando
falha, o formulário continua editável (preenchimento manual). O caminho confiável
futuro é a extensão de navegador (§24), não guerra anti-bot.

Nota afiliado (Slice A): colar `meli.la/xxx` (link de afiliado gerado pelo ML)
funciona. `meli.la` redireciona para uma pré-página `/social/` — que NÃO é a
página do produto, mas cujo HTML estático traz `og:title`+`og:image` e o link
real do produto (`href=".../p/MLB\d+"`). `importDeal`: se a URL colada não tem
MLB id (`mlbIdFromUrl`), busca a landing, extrai a URL do produto
(`productUrlFromSocialHtml`), busca o produto e faz merge — dado do produto tem
precedência, og da landing preenche lacunas (título/imagem). O `meli.la` colado
vira o `affiliateUrl` pré-preenchido; a URL do produto resolvida vira o
`sourceUrl` (removido da tela, mantido no modelo → invariante afiliado≠origem
continua válida). Preços: a página `/p/` é anti-botada no servidor e os preços
são renderizados por JS lá, então NÃO vêm no fetch — título+imagem preenchem,
preço é manual (até a extensão §24). Campo "URL de origem" removido do form.

Nota Baileys: conexão real exige rede + scan de QR num telefone; não dá para
testar no sandbox. As invariantes de delivery são testadas contra um
`FakeMessaging` (`tests/support/`); o gateway é integração (só typecheck).
`makeWASocket` precisa de `version` de `fetchLatestBaileysVersion()` — sem isso
o handshake trava em `connecting` e nunca emite o QR. Baileys fixado em `7.x`
(rc): grupos com `addressing_mode='lid'` quebram no `6.x` — o envio trava
buscando a prekey do device no namespace errado e estoura o `defaultQueryTimeoutMs`
(60s), falhando com "Timed Out". O `7.x` reescreve o roteamento LID e resolve;
as creds do `6.x` são aceitas sem re-parear.

Nota segurança: API e gateway ligam em `127.0.0.1` (uma máquina, um operador);
sem auth por request enquanto local (§17). Gateway valida `imageUrl` só por
protocolo (http/https) — o `imageUrl` vem da oferta do próprio operador e o
gateway é local, então SSRF de IP privado está fora do modelo de ameaça. Se um
dia o gateway aceitar entrada não confiável (SaaS): resolver DNS, bloquear
faixas privadas/loopback/link-local e fixar o IP resolvido no fetch.

Adiado até o slice que usa (nada de decoração):

- **Better Auth** → quando existir rota protegida.

Nota fila/agendamento (S5): a UI virou um dashboard com abas (Nova oferta / Fila
/ Histórico / Config) em `apps/web/src/tabs/*` (App.tsx só faz o shell de abas;
`lib.ts` = fetch helpers, `ui.tsx` = primitives). A "fila" NÃO é infra nova: um
envio agendado é uma `delivery` com `status='scheduled'` + `dueAt` (coluna nova).
`schedulePublication` (`features/publications/schedule/use-case.ts`) enfileira
serial global: cada envio pega `dueAt = max(agora, cauda da fila) + aleatório[min,
max]`, então a conta nunca dispara em rajada (parece humano). Um loop in-process
(`scheduler.ts` `startScheduler`, setInterval 30s no boot da API) chama
`dispatchDue` que pega o `scheduled` vencido mais antigo, um por vez, e reusa o
`deliverOne` compartilhado (`send/deliver.ts`, extraído do send imediato — mesmo
caminho, mesma idempotência/dedupe). Falha vira `failed` e NÃO re-tenta sozinha
(fail-closed; operador reenvia). Faixa de delay configurável em `settings`
(tabela nova, default 1200–2400s = 20–40 min) na aba Config; "Enviar agora"
(imediato) e "Agendar" coexistem. Sem Redis/fila externa — fiel ao custo-zero,
exige só a API rodando. Fila é gerenciável (`features/queue/use-case.ts`):
`cancelScheduled` deleta um `scheduled` (volta a pub p/ `ready` se era o último);
`reorderQueue(orderedIds)` mantém os slots de `dueAt` fixos e só troca qual item
ocupa cada slot (preserva o espaçamento). UI: setas ↑/↓ (swap) + ✕ na aba Fila,
otimista com pausa no auto-refresh durante a ação.

Nota template de mensagem: a mensagem da oferta é personalizável (aba Config).
`render.ts` exporta `DEFAULT_TEMPLATE` (reproduz o formato clássico) e
`renderPublication(input, template)` faz substituição de placeholders
(`{titulo}`, `{de}`, `{por}`, `{cupom}`, `{link}`) com **drop de linha**: uma
linha cujos placeholders todos resolvem vazio some (ex.: sem cupom), e runs de
linhas em branco colapsam. `settings.messageTemplate` guarda o template (default
= `DEFAULT_TEMPLATE`); `updateSettings` é **partial-merge** e **rejeita template
sem `{link}`** (fail-closed: sem o link a oferta sairia sem monetização).
`preview`/`create` puxam o template de `settings`. `{de}`/`{por}` já vêm
formatados via `formatBrl` (com R$). Editor na Config tem chips que inserem no
cursor + preview ao vivo (client-side, valores de exemplo).

FUTURO (marcado pelo usuário, adiado — hoje `workspaceId` é fixo em
`DEFAULT_WORKSPACE_ID`): workspace multi-tenant com nome/logo, múltiplos números
de WhatsApp, múltiplos grupos/nichos. Só quando existir 2+ número de verdade.

Roadmap: S1 importar URL ✅ → S2 criar publicação ✅ → S3 WhatsApp ✅ → S4
importar mensagem ✅ → S5 dashboard + fila/agendamento + config ✅.

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
bun run dev        # web (vite) + api (:3001) + wa-gateway (:3002)
bun run lint
bun run typecheck
bun test
bun run format
bun run --filter '@dealflow/api' db:generate   # após mudar o schema
```

DB local em `dealflow.db` (raiz da api, ignorado no git); override via
`DATABASE_URL`.
