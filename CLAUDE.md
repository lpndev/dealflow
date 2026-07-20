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
- Import **nunca** confia num `meli.la` colado como nosso afiliado **pelo código
  curto sozinho** (pode ser de concorrente; server não distingue o código). Exceção
  segura: se o operador configurar sua `tag` de afiliado (`settings.mlAffiliateTag`,
  aba Config), o import resolve o `/social/<tag>` da landing e **só quando a tag
  bate com a dele** confia no `meli.la` colado como nosso `affiliateUrl` — um link
  de concorrente resolve pra outra tag e continua saindo vazio (fail-closed
  preservado; ver Nota reconhecer link próprio). Sem tag configurada, sai sempre
  vazio e só a extensão o preenche (captura na página ML — inclusive o botão "gerar
  meu link" que abre o produto e traz o nosso de volta).
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
- **Repositório público, licença anti-concorrência.** O código é source-available
  sob PolyForm Perimeter 1.0.1 (`LICENSE.md`): self-host à vontade, inclusive
  comercial pro próprio uso; proibido é oferecer a terceiros um produto que
  compete com o Dealflow (revenda, cópia como serviço concorrente) — a monetização
  é a nossa cloud. O nome/logo "Dealflow" não são licenciados. Como o repo é
  público, **NADA sensível entra nele, em nenhum lugar (código, testes, docs,
  histórico)**: sem segredos, tokens, sessão do WhatsApp (`wa-auth/`), banco
  (`*.db`), emails, telefones, JIDs, etiquetas ou links de afiliado reais. Use
  placeholders/fakes (`meli.la/xxxxxxx`, `ct`+timestamp, `0@g.us`). Ao mexer,
  varra o diff antes de commitar. Segurança sobe de prioridade daqui pra frente
  (ver Nota segurança e Nota auth/tenancy): o modelo continua local
  (`127.0.0.1`), mas **já existe auth real** (better-auth) e todo dado é isolado
  por workspace na fronteira (a query filtra por `workspaceId` da sessão, testado);
  ao expor qualquer superfície a entrada não confiável, endurecer o resto antes
  (validar na fronteira, sem SSRF, sem vazar dados de um operador pra outro).

Trajetória MVP → SaaS (decisão arquitetural durável): o produto vai virar SaaS
numa VPS e ser monetizado. Mas **scraping SÓ funciona em contexto residencial +
browser real — NÃO porta pra VPS de datacenter** (é justo o IP que o ML bloqueia
mais forte; ver Nota aquisição de dados). Logo, ao escalar, separa as camadas: a
**aquisição de dados** fica client-side (extensão no browser do usuário) ou
por-usuário via API OAuth; a **orquestração** (fila, publicação, agendamento,
painel) sobe na VPS sem problema. Scraping direto da VPS só com proxy residencial
pago (come a margem do SaaS) — evitar. Toda dependência de raspagem fica atrás da
fronteira `ProductSource` pra permitir essa troca sem reescrever o resto.

## Stack

- **Monorepo:** Bun workspaces (`apps/*`, `packages/*`)
- **Web:** React + Vite + Tailwind v4 (`@tailwindcss/vite`) — `apps/panel`.
  UI **shadcn/ui** (base-lyra, phosphor). Rotas reais com **React Router (data
  mode)**, server-state com **TanStack Query**, toasts com **Sonner** (shadcn),
  forms com **TanStack Form** ligado às primitives `Field` do shadcn; **Zustand**
  instalado e ocioso (staged p/ estado global futuro) (ver Nota SPA)
- **API:** Hono + Bun (porta 3001) — `apps/api`
- **Extensão:** `@dealflow/extension` (`apps/extension`) — MV3 via **Extension.js**
  (extension.js.org, Rspack) + React + TS; popup reúsa `@dealflow/ui` (ver Nota
  extensão de captura)
- **Shared:** `@dealflow/shared` (`packages/shared`) — contratos-fio cross-app,
  só tipos, consumido como source `.ts` (sem build)
- **UI:** `@dealflow/ui` (`packages/ui`) — design system reutilizável, consumido
  como source `.tsx` (sem build, igual ao shared) (ver Nota packages/ui)
- **Qualidade:** TypeScript strict, ESLint (flat, + `eslint-plugin-react-hooks`
  oficial no web e `eslint-plugin-sonarjs` da SonarSource — as regras do SonarLint
  rodam no `bun run lint`; nada de plugins de terceiro), **lint type-aware**
  (`ts.configs.recommendedTypeChecked` + `projectService`) (ver Nota lint), Prettier (+
  `@ianvs/prettier-plugin-sort-imports` e `prettier-plugin-tailwindcss`),
  **Vitest** (unit, roda sob o runtime do Bun) + **Playwright** (e2e),
  centralizados em `@dealflow/tests` (ver Nota testes)

Fronteiras previstas (interface só quando separa dependência externa real):
`ProductSource`, `AffiliateLinkProvider`, `MessagingProvider`.

## Estado atual

Fundação + Slices 1–5 + import de afiliado (`meli.la`) prontos. `apps/panel`,
`apps/api` e `apps/wa-gateway` sobem localmente; lint, typecheck, test e format
funcionam. Detalhes de cada peça nas notas abaixo e no roadmap.

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
boot. Auth real desde a fundação auth/tenancy: `workspaceId` vem do workspace
ativo da sessão, não mais de `DEFAULT_WORKSPACE_ID` fixo (ver Nota auth/tenancy).

Slice 3 (+ WhatsApp por workspace, 2026-07-12): `apps/wa-gateway` (porta 3002)
isola o Baileys — **multi-sessão por workspace**: cada sessão em
`wa-auth/<workspaceId>/` (`useMultiFileAuthState`), estado num
`Map<sessionId, Session>`. API do gateway: `GET /health`,
`GET /sessions/:id[/qr|/groups]`, `POST /sessions/:id/{connect,end,logout,messages}`
(`:id` validado `^[A-Za-z0-9_-]+$` — nunca vira path traversal). No boot
reconecta toda sessão com dir salvo. **Adoção da sessão legada**: no primeiro
`connect` de um workspace, se existir `wa-auth/creds.json` flat (layout antigo)
e o workspace não tiver dir, os arquivos são movidos pra dentro — o número já
pareado migra sem QR novo (verificado ao vivo 2026-07-12). O **web NÃO fala
mais com o gateway** — tudo mediado pela API em `/wa/*`
(`features/whatsapp/route.ts`, `requireAuth`, sessão = `workspaceId` da sessão
de auth): `GET /wa/session` (status pra qualquer membro — um publisher
convidado usa o WhatsApp do workspace sem parear nada; o **QR só sai pra
admin+**, publisher recebe `qr:null` — senão, durante um pareamento, qualquer
membro poderia escanear o QR primeiro e vincular o próprio telefone), `POST
/wa/{connect,end,logout}` (admin+ via `requireRole`). A API fala com o gateway
atrás do `MessagingProvider` (`shared/messaging.ts` — métodos recebem
`sessionId` = workspaceId; invariante testada: a delivery usa o workspace dela
como sessão); o domínio só vê `externalId` opaco (o JID `@g.us` nunca vaza).
`POST /destinations/sync` importa grupos; `POST /publications/:id/send
{ destinationIds }` cria `delivery` por destino, envia sequencial (sem fila),
marca `sent`/`failed`, e a publicação vira `sent` quando todas passam. Web:
status compacto no header (ícone WhatsApp + bolinha, Popover com QR/detalhes),
seção WhatsApp na Config (dot + 3 botões com ícone, explicação no hint),
sincronizar grupos, selecionar destinos, Enviar, status por destino.

Invariantes cobertas por teste: publicação usa nosso `affiliateUrl` (nunca a
`sourceUrl`); rejeita afiliado ausente/inválido ou igual à origem; produto é
reusado entre snapshots; `unique(publicationId, destinationId)` (sem delivery
duplicada); retry não reenvia delivery já `sent`; falha marca `failed` e um
retry pode virar `sent`.

Nota aquisição de dados / anti-bot ML (investigado 2026-07-08): o ML fechou o
acesso público. API (`/items`, `/products`, `/sites/MLB/search`) exige token OAuth
(403/401). A página web de produto serve um desafio JS anti-bot
(`suspicious-traffic` → redireciona pra `/gz/account-verification`) que bloqueia
IP de datacenter mais forte. `curl`/`fetch` apanha **mesmo de IP residencial** (é
TLS-fingerprint + desafio JS, não só IP). Verificado que um **motor de browser
real** (Playwright headless) de IP residencial **passa o desafio** e lê o preço
do JSON-LD (ex.: 189,96 em ~4,5s). A landing `/social/` do afiliado não é
bloqueada mas só tem título+imagem (sem preço).

Decisão: aquisição de preço fica atrás da fronteira `ProductSource`. Impl. atual
aprovada = `PlaywrightSource` (local, IP residencial); título+imagem podem vir do
`/social/`, o preço vem do `ProductSource`; fallback sempre pro preenchimento
manual se falhar. Playwright é dep pesada (~114MB Chromium, ~4,5s/import) mas
justificada: mata o atrito de digitar preço em toda oferta, e está isolada atrás
da fronteira. Impls. futuras do `ProductSource` p/ SaaS: `ExtensionSource`
(browser do usuário), `MlApiSource` (OAuth do usuário). Nunca guerra anti-bot no
servidor.

Nota afiliado (Slice A): colar `meli.la/xxx` (link de afiliado gerado pelo ML)
funciona. `meli.la` redireciona para uma pré-página `/social/` — que NÃO é a
página do produto, mas cujo HTML estático traz `og:title`+`og:image` e o link
real do produto (`href=".../p/MLB\d+"`). `importDeal`: se a URL colada não tem
MLB id (`mlbIdFromUrl`), busca a landing, extrai a URL do produto
(`productUrlFromSocialHtml`), busca o produto e faz merge — dado do produto tem
precedência, og da landing preenche lacunas (título/imagem). A URL do produto
resolvida vira o `sourceUrl` (removido da tela, mantido no modelo → invariante
afiliado≠origem continua válida). Por padrão o `meli.la` colado **NÃO** vira o
`affiliateUrl` (fail-closed: podia ser link de concorrente — um amigo quase
publicou o link do outro grupo; ver Nota auto-mint e Nota reconhecer link próprio).
O afiliado sai vazio; a extensão gera o nosso. Preços: a página `/p/` é anti-botada
no servidor e os preços são renderizados por JS lá, então NÃO vêm no fetch —
título+imagem preenchem, preço vem da extensão/`ProductSource` (ver Nota aquisição
de dados). Campo "URL de origem" removido do form.

Nota reconhecer link próprio + re-verificar (2026-07-10): dois atritos reais do
operador. (1) Ao colar SEU próprio `meli.la`, o server não distinguia do de
concorrente e pedia "gerar meu link" de novo. Fix: `settings.mlAffiliateTag` (aba
Config, coluna nova, formato `ct`+timestamp = a `tag` em uso na conta de afiliado).
No import, `affiliateTagFromSocialHtml` lê o `/social/<tag>` da landing; se bate com
a tag configurada, o `meli.la` colado vira o `affiliateUrl` (senão, vazio como
antes — invariante fail-closed intacta: link de concorrente resolve pra outra tag).
Tag lida do HTML da landing (mesmo estilo do `productUrlFromSocialHtml`); se o ML
parar de expor a tag no HTML, trocar pelo URL final do redirect (`res.url`).
(2) "Abrir no ML e gerar meu link" só preenchia o afiliado e descartava o resto
que a extensão já raspava (a captura traz título/imagem/De/Por/afiliado completos
da página logada). Fix: o poll de `/deals/capture` no web, quando o produto capturado
bate com o do form (mesmo `externalId`), faz `mergeCapture` = **puxa tudo do ML**
(sobrescreve preço/título/imagem com o dado real recém-raspado — o ML às vezes troca
o preço ao gerar o link; mantém o cupom digitado; cola o afiliado novo). O botão
`Revisar` agora aparece quando falta afiliado **OU** preço (label muda: "gerar meu
link" vs "atualizar preço"), então um link próprio já com afiliado mas sem preço
também puxa o preço real. Extensão inalterada — já mandava o deal completo.

Nota geração do link de afiliado (reverse-engineered 2026-07-09, verificado no
browser logado do operador): o botão "Compartilhar" da barra de afiliado do ML
faz DUAS chamadas na própria sessão logada (só cookie, sem CSRF/token):
`GET /affiliate-program/api/v2/stripe/user/tags` → `{ tags: [{ tag, in_use,
generated_date }] }` (a etiqueta do afiliado, formato `ct` + timestamp); e
`POST /affiliate-program/api/v2/stripe/user/links` com body
`{ url: "<url do produto /p/MLBxxxx>", tag: "<a tag>" }` → resposta
`{ id, short_url: "https://meli.la/xxx", long_url: "/social/<tag>?...",
origin_url, type_url: "SOCIAL_PROFILE_ENCRYPTED", ... }`. O `short_url` é o nosso
`meli.la`. Dedupe por `(url, tag)`: mesmo par sempre devolve o mesmo short link.
Provado que um `fetch(..., { method:'POST', credentials:'include', body })` puro
replica a geração (status 200, mesmo `meli.la`). É exatamente o que a
`ExtensionSource` faz: a extensão roda no `mercadolivre.com.br` do usuário
(content script), lê a `tag` em uso e chama `/links` com a URL do produto pra
gerar O NOSSO link — sem OAuth, sem dev center (contorna o `USER_BLOCKER` do
operador). **Gotcha (host):** a API de afiliado só existe em
`www.mercadolivre.com.br`, mas o content script roda em QUALQUER subdomínio de
produto (`produto.mercadolivre.com.br`, `www.`…); então o fetch usa URL
**absoluta** pra `www.` (`AFFILIATE_API` em `ml-page.ts`) — fetch relativo caía em
404 no subdomínio `produto.` ("não autenticado como afiliado"). Cross-origin
`produto.`→`www.` passa porque as `host_permissions` cobrem `*.mercadolivre.com.br`
e o cookie de sessão é do domínio inteiro (verificado ao vivo 2026-07-16).
operador). API oficial (`MlApiSource`) fica como caminho paralelo quando o
suporte do ML liberar a conta; a extensão é o fallback permanente pra quem tiver
a mesma restrição.

Nota Baileys: conexão real exige rede + scan de QR num telefone; não dá para
testar no sandbox. As invariantes de delivery são testadas contra um
`FakeMessaging` (`tests/support/`); o gateway é integração (só typecheck).
`makeWASocket` precisa de `version` de `fetchLatestBaileysVersion()` — sem isso
o handshake trava em `connecting` e nunca emite o QR. Baileys fixado em `7.x`
(rc): grupos com `addressing_mode='lid'` quebram no `6.x` — o envio trava
buscando a prekey do device no namespace errado e estoura o `defaultQueryTimeoutMs`
(60s), falhando com "Timed Out". O `7.x` reescreve o roteamento LID e resolve;
as creds do `6.x` são aceitas sem re-parear.

Nota segurança: API e gateway ligam em `127.0.0.1` por default (uma máquina, um
operador), agora via env `HOST`/`PORT` e `WA_GATEWAY_HOST`/`WA_GATEWAY_PORT` (ver
Nota config/env — ao hospedar exposto direto, `HOST=0.0.0.0`; atrás de proxy,
mantém 127.0.0.1). Como o gateway, a **API recusa subir fora de loopback sem
`BETTER_AUTH_SECRET` forte** (`HOST` não-loopback + secret ausente ou
`dev-secret-change-me` → throw no boot; `index.ts`, fail-closed) — o secret só
cai no default de dev em loopback.
A **API já exige auth por request** (better-auth, ver Nota auth/tenancy): toda
rota de domínio passa por `requireAuth` e filtra pelo `workspaceId` da sessão —
a isolação por workspace é a fronteira que impede um operador ver dado do outro
(testada em `workspace-isolation.test.ts`). A sessão de WhatsApp também é
por-workspace (ver Slice 3): o web só a acessa via `/wa/*` autenticado; status
pra qualquer membro, QR e gerenciar (connect/end/logout) é admin+. O **gateway**
(`:3002`): local sem token continua confiado (só a API fala com ele), mas
`WA_GATEWAY_TOKEN` (env compartilhada, `.env` da raiz) liga auth por request —
gateway exige `x-gateway-token` (`bearerAuth` first-party do Hono com
`headerName` custom, compare timing-safe por digest; montado só em
`/sessions/*`, `/health` fica aberto) e a API o envia; **bind fora de loopback sem token recusa subir**
(`index.ts` do gateway, fail-closed). O `:id` de sessão é validado
(`^[A-Za-z0-9_-]+$`) antes de virar path de fs. `imageUrl` no send: o gateway
**baixa a imagem ele mesmo** (`fetch-image.ts`) e passa o Buffer ao Baileys —
resolve DNS e exige todo IP público (`isPublicIp` bloqueia
privado/loopback/link-local/CGNAT/reservado, v4 e v6/mapped, testado), re-valida
cada hop de redirect (máx 3), timeout 15s e cap 5MB streaming. Residual aceito:
janela TOCTOU de DNS-rebinding entre lookup e fetch (Bun não expõe pin de IP no
fetch) — mitigada porque a API só aceita `imageUrl` do CDN mlstatic
(`isTrustedImageUrl`). **Rate limit de domínio** (`shared/rate-limit.ts`):
fixed-window em memória por `workspaceId` — `/deals/import` 10/min (dispara
fetch server-side ao ML), send e schedule 20/min; `DEALFLOW_E2E` desliga (mesmo
padrão do better-auth); ponytail: Map em memória num processo só — vira store
compartilhado se a API escalar horizontal. Erros 429 saem como
`{ error: "too many requests" }`.

Nota auth/tenancy (fundação, feat/auth-tenancy-foundation): **better-auth**
montado no Hono em `/api/auth/*` (adapter Drizzle, mesmo `bun:sqlite`/migração;
tabelas geradas em `shared/auth-schema.ts`, re-exportadas de `shared/schema.ts`).
Plugins: `emailAndPassword` (registro público, sem verificação de email no MVP —
custo-zero, sem envio), `organization` (**organization = workspace**) e `apiKey`
(`@better-auth/api-key`; autentica a extensão). Roles owner/admin/publisher
(internamente `owner`/`admin`/`member`; "Publisher" é o rótulo de `member`)
definidos via access-control em `shared/auth/permissions.ts` e passados ao plugin.
Matriz (server-side, fail-closed, `requireRole` após `requireAuth`): publisher
cria/agenda/envia publicação + lê dashboard/fila/histórico + lista destinos;
admin+ gerencia settings (template/delays/tag ML), sync/toggle de destinos,
membros, API keys e a sessão de WhatsApp (`/wa/connect|end|logout`); só owner
exclui workspace/billing. **`workspaceId` vem SEMPRE
da sessão** (`session.activeOrganizationId`), nunca do body/query — é a fronteira
de segurança. Bootstrap: o 1º signup **reivindica o workspace `default`** só se
ele já tiver dado real (destino/publicação — o operador que já usava), senão vai
pro onboarding criar o próprio (evita takeover num deploy fresco);
`resolveActiveWorkspace` (`shared/auth/workspace-claim.ts`) roda no
`session.create.before` (não num after, pra a 1ª sessão já sair com org ativa).
Extensão: autentica `/deals/capture` por `x-api-key` (chave gerada na aba Config,
metadata guarda o `organizationId`) → workspace vem da chave; o slot de captura
virou `Map` por-workspace. Web: better-auth React client, rotas públicas
`/login`/`/signup`/`/onboarding`/`/accept-invite/:id`, guard (`protectedLoader`)
no Layout + `guestLoader` em `/login`/`/signup` (sessão ativa redireciona pra
dentro honrando `?redirect=` via `safeRedirect` — logado não vê tela de auth;
coberto no e2e), switcher de workspace + menu de usuário no header, aba Equipe (membros
e convite por **link copiável**, sem email) e painel de API keys na Config.
Rate limit + guard de sessão (corrigido 2026-07-18): o `rateLimit` do better-auth é
`{ window: 10, max: 100 }` = **o default da lib**. NÃO apertar o global achando que
protege login: o better-auth aplica `getDefaultSpecialRules()` que **sobrescreve** o
global em `/sign-in`, `/sign-up`, `/change-password`, `/change-email` (**3 por 10s**) e
nos de reset de senha (3 por 60s) — ordem: global → special rules → plugins →
`customRules`. O projeto tinha `{ window: 60, max: 10 }` (10 req/min pra TUDO), o que
não deixava o login mais seguro (já era 3/10s) e estrangulava `/get-session`, chamado a
cada navegação de rota do SPA: bastavam ~10 navegações pra 429. Verificado ao vivo após
o fix: 20/20 `get-session` = 200, e sign-in = `401,401,401,429,429,429` (brute force
segue barrado). Junto, o `protectedLoader` (`main.tsx`) **distinguia mal**: fazia
`if (!data) redirect("/login")`, então um 429 (ou rede caindo) deslogava a tela com a
sessão **válida no banco**. Agora só manda pro login em `error.status === 401`; em
qualquer outro erro devolve `null` e deixa passar — o guard do client é UX, não
segurança (o backend valida request a request; ver Nota SPA §Segurança). Sessão dura
**7 dias** (default), com renovação por atividade — não é 1 dia. Esse bug **não aparece
no e2e** porque o harness desliga o rate limit (`DEALFLOW_E2E`); só aparece no uso real.
Lição geral: mudou proteção → **medir os dois lados** (tráfego benigno continua
passando E o ataque continua barrado — ex.: curl no sign-in até 429), porque o
e2e desliga o rate limit e nunca acusa esse tipo de regressão.

Diferido (portas abertas): planos/tiers/trial 7 dias JÁ construído (ver Nota
planos/tiers) — falta só o **pagamento** (`@better-auth/stripe`, checkout, webhooks,
upgrade/downgrade/cancelamento); e envio de email, múltiplos números de WhatsApp,
múltiplas contas ML + nichos, split da landing page. Segredo em env
(`BETTER_AUTH_SECRET`; throw em produção sem ele).

Nota better-auth gotchas (1.6.23 — fatos fora do happy path da doc que custaram
debug real):

- **O plugin apiKey mora num package SEPARADO, `@better-auth/api-key`** — NÃO em
  `better-auth/plugins` (que só tem `organization` etc.). Client: `apiKeyClient`
  vem de `@better-auth/api-key/client`; `organizationClient` esse sim vem de
  `better-auth/client/plugins`.
- **`@better-auth/cli generate` roda sob NODE** (shebang node) — nunca pode
  importar nada que puxe `bun:sqlite`. Pra gerar o schema Drizzle: config
  temporária com adapter STUB (`drizzleAdapter({} as never, { provider:
"sqlite", schema })` — a geração só lê a forma da config), apagar depois.
  Migrar pelo pipeline normal `db:generate` → boot; **NUNCA `better-auth
migrate`** (Kysely-only).
- **Ordem dos databaseHooks:** no signup, `createUser`→`linkAccount`→
  `createSession` rodam numa transação só; hooks `create.after` são ADIADOS pra
  depois da transação inteira, `create.before` rodam inline. O que a sessão
  precisa já na criação (ex.: `activeOrganizationId`) tem que acontecer em
  `session.create.before`, não em `user.create.after` — senão a 1ª sessão
  persiste com valor nulo pelo TTL inteiro (`shared/auth/workspace-claim.ts`).
- **API keys são user-scoped por default** (`references: "user"`):
  `listApiKeys`/`deleteApiKey` só veem/agem nas chaves do próprio user, e
  `deleteApiKey` só checa dono, NÃO org — checar o workspace da metadata antes
  de deletar. `listApiKeys` devolve `{ apiKeys, total, limit, offset }` (não
  array). `metadata` pode voltar objeto OU string JSON — tratar os dois.
- **`getActiveMember({ headers })` LANÇA** (`NO_ACTIVE_ORGANIZATION`) em vez de
  devolver null sem org ativa — `.catch(() => null)` e negar é o padrão
  fail-closed.
- **`member.role` é string CSV** (multi-role) — check server-side sempre parseia
  o CSV, nunca `=== "owner"`; centralizado em `roles()`/`isOwner()`
  (`apps/api/src/shared/auth/hierarchy.ts`).
- **O client do better-auth NÃO lança:** resolve `{ data, error }` com `error`
  objeto plano (não `Error`) — ler `result.error?.message` direto. Ops void
  (ex.: `cancelInvitation`) podem resolver `{ data: null, error: null }` no
  SUCESSO — null-sem-erro é sucesso, não falha.

Nota hierarquia + multi-workspace + danger zone (feat/roles-workspaces-danger-zone):
extensão reuso-pesado da fundação, **sem novo modelo de papéis nem matriz custom**
(os 3 papéis fixos ficam). (1) **Hierarquia de papéis** (rank owner>admin>publisher):
o better-auth 1.6.23 já barra publisher gerenciar membros e já barra qualquer não-owner
mexer no owner / promover a owner (gate `creatorRole` em `crud-members`). A única regra
residual — **admin confinado a publisher** — vem de um `hooks.before` global
(`shared/auth/hierarchy.ts`, `hierarchyGuard` via `createAuthMiddleware`) que casa
`/organization/{update-member-role,remove-member,invite-member}`, lê o ator por
`getSessionFromCtx` (o **org-hook `beforeUpdateMemberRole` passa o `user` ALVO, não o
ator** — por isso guard no nível de request, não org-hook) e chama a pura
`hierarchyAllows({actorRole,targetRole?,requestedRole?})` (invariante testada: admin não
escala publisher nem toca admin/owner). Web: `useActiveRole`+`roleRank`; dropdown de papel
só pra owner (com "Tornar dono"), demais veem Badge; convite oferece admin/publisher (owner)
ou só publisher (admin). Owner é promoção-only, nunca via convite. (2) **Criar múltiplos
workspaces**: helper `createWorkspace(name)` (extraído do onboarding — create+slug-collision+
setActive) + item "Novo workspace" no `WorkspaceSwitcher` (Dialog shadcn). (3) **Zona de
perigo** (fim da Config, `components/danger-zone.tsx`, AlertDialog shadcn): revogar todas as
chaves (admin+, `DELETE /api-keys`), excluir workspace (owner, `DELETE /workspace` — cascata
das tabelas de domínio por `workspaceId` + revoga chaves + **logout da sessão de WhatsApp do
workspace** + `deleteOrganization`; confirma digitando o nome), resetar tudo
(`POST /workspace/reset` — apaga todos os workspaces que o user é dono, cada um deslogando a
própria sessão de WhatsApp; mantém a conta), excluir conta (**verifica a senha
ANTES de qualquer destruição** via `authClient.signIn.email` — senha errada
aborta sem apagar nada — depois `reset` + `authClient.deleteUser({password})`;
`user.deleteUser.enabled` ligado no auth). O verify-first existe porque `reset`
tem que rodar autenticado (precede o `deleteUser`, que invalida a sessão), então
sem o `signIn` de guarda uma senha errada apagava os dados e só falhava no
`deleteUser`.
`MessagingProvider.logout(sessionId)` → gateway `POST /sessions/:id/logout` (apaga
`wa-auth/<id>/`). Boundary dito na UI: login ML + config da extensão vivem no navegador
(o web não limpa — o user limpa lá).

Nota planos/tiers (MVP, feat/plans-tiers): fundação de planos SEM pagamento (Stripe,
checkout, upgrade/downgrade fica pra depois — ver FUTURO). Tudo em
`apps/api/src/shared/plans.ts`; os TIPOS (`PlanId`/`PlanLimits`/`Plan`/`WorkspaceUsage`/
`PlanStatus`) em `@dealflow/shared` (só-tipos preservado — VALORES na api, cruzam o fio via
`GET /plan`). **O backend é a ÚNICA fonte da verdade**; o frontend (PlanPanel, esconder botão)
é só reflexo e é assumido comprometível — toda mutação passa por check server-side.

**PLANO É POR DONO (conta), NÃO por workspace** — decisão de anti-burla (1ª versão era
per-workspace e um user criava N workspaces pra multiplicar limites; furo real). O plano vive
em **`account_plan(userId pk, plan default 'free')`** (migration `0008`, sem FK — órfão é
inócuo); **NÃO** há coluna de plano em `settings` (não editável por ninguém — fail-closed: um
free não se auto-promove; o webhook do Stripe escreverá em `account_plan`). Um workspace é
governado pelo plano do **seu dono** (`ownerOf` = membro com role `owner`); `resolvePlanForUser`
e `resolvePlanForWorkspace`. **Todo limite é GLOBAL, somado em TODOS os workspaces que o dono
possui** (`scopeIds` = `ownedWorkspaceIds(owner)`) — trocar de workspace NÃO reseta contagem
(verificado ao vivo: Grupos 1/3 igual em dois workspaces). Órfão sem dono → escopo = só ele
mesmo com limites free (fail-closed, nunca bypass ilimitado).

Dois mecanismos: (1) **self-host = ilimitado** via env `SELF_HOST=true` (`isSelfHost()`) —
licença PolyForm permite; bypassa tudo E **o PlanPanel some inteiro** (`GET /plan`
`selfHost:true` → `PlanPanel` retorna null). `.env.example` traz `SELF_HOST=true` (template do
self-hoster e default local — pra rodar local SEM plano, o operador seta no `.env` e reinicia a
api); nossa cloud NÃO seta. (2) **4 tiers cloud** (`free`/`starter`/`pro`/`business`) em `PLANS`;
preços TBD (só `free.priceBrl=0`). Dimensões (todas por-dono agregadas): **envios/mês**
(free 100/starter 1000/pro 5000/business ∞), **grupos** (destinos habilitados: 3/10/30/∞),
**membros** (userIds distintos + convites pendentes: 1/2/5/∞), **workspaces** (1/1/3/∞) e
nºWhatsApp/contas ML (**definidos mas sem enforcement — estruturalmente 1 hoje; check nasce com
a feature multi**). **`free` = trial 7 dias**: `trialEndsAt = user.createdAt + 7d` (por conta,
não por workspace); trial expirado + ainda `free` → bloqueia envio/grupo/convite/criar-workspace.

Enforcement na fronteira (server-side): `assertCanSend` em `sendPublication`+`schedulePublication`
(adding=nº deliveries novas — no send imediato exclui destinos já `sent`, via `newSendCount`, pra
retry não recontar). **O "usado" do mês conta enviadas (`sent` no mês) MAIS a fila (`scheduled`/
`processing`), via `usedSends`** — senão vários `schedule` em sequência furavam o cap antes de
qualquer dispatch (o `dispatchDue`/`deliverOne` NÃO re-checa plano). Atribuição de mês da fila é
aproximada (conta toda pendente, fail-closed). `assertCanEnableDestination`+`destinationSlotsLeft` em
`setDestinationEnabled`+`syncDestinations` (sync insere grupos além do cap como `enabled:false`);
`canAddMember` no convite via `hierarchyGuard` (`hooks.before`, path `/organization/invite-member`,
throw `APIError`); **cap de workspace via a opção oficial do better-auth
`allowUserToCreateOrganization: (u) => canCreateWorkspace(db, u.id)`** (barra o `/organization/create`
server-side; o web mapeia o code `YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION` pra msg
amigável). Plano desconhecido → `free` (fail-closed). Rotas mapeiam `PlanLimitError` → **HTTP 402**
(send/schedule/destinations); o web propaga `data.error` no toast. Web: `PlanPanel` no topo da
Config (some no self-host; barras envios/grupos/membros/workspaces, badge de trial). TDD em
`packages/tests/api/shared/plans.test.ts` (self-host bypassa; **envios/grupos agregam entre
workspaces sem reset**; conta só o mês-calendário; **cap de workspace por dono**; trial expira;
plano pago sem trial; **workspace governado pelo dono, não pelo viewer**; desconhecido→free).
Verificado ao vivo: Grupos 1/3 idêntico em 2 workspaces (agrega), Workspaces 3/1 (sobre o cap),
criar 4º workspace rejeitado pelo server ("Seu plano não permite criar mais workspaces").

Nota fila/agendamento (S5): a UI é um dashboard de 5 telas (Início / Nova oferta /
Fila / Histórico / Config), hoje **rotas reais** em `apps/panel/src/routes/*` (ver
Nota SPA; antes eram abas com `useState`). A "fila" NÃO é infra nova: um
envio agendado é uma `delivery` com `status='scheduled'` + `dueAt` (coluna nova).
`schedulePublication` (`features/publications/schedule/use-case.ts`) enfileira
serial global. O intervalo aleatório[min,max] é o **espaçamento ENTRE itens**, não
um atraso do primeiro: fila vazia → o 1º envio sai no `startAt` (default agora, sem
esperar), os seguintes espaçados por aleatório[min,max]; fila não-vazia → o novo
lote entra depois da cauda existente (`cauda + aleatório`). `startAt` (ISO no body
do `/schedule`, seletor datetime-local no painel Enviar; passado in the past →
clamp pra agora) deixa o operador escolher quando a fila começa. Assim a conta
nunca dispara em rajada e um envio único não fica preso 20–40 min à toa. Um loop in-process
(`scheduler.ts` `startScheduler`, setInterval 30s no boot da API) chama
`dispatchDue` que pega o `scheduled` vencido mais antigo, um por vez, e reusa o
`deliverOne` compartilhado. O scan é **global entre workspaces** (não há fila
justa por tenant), mas exclui os workspaces pausados **na própria query**
(`notInArray` sobre `settings.queuePaused`) — senão a linha vencida e parada de
um tenant pausado travaria a entrega de todos os outros pra sempre (`send/deliver.ts`, extraído do send imediato — mesmo
caminho, mesma idempotência/dedupe). Falha vira `failed` e NÃO re-tenta sozinha
(fail-closed; operador reenvia). Faixa de delay configurável em `settings`
(tabela nova, default 1200–2400s = 20–40 min) na aba Config; "Enviar agora"
(imediato) e "Agendar" coexistem. Sem Redis/fila externa — fiel ao custo-zero,
exige só a API rodando. Fila é gerenciável (`features/queue/use-case.ts`):
`cancelScheduled` deleta um `scheduled` (volta a pub p/ `ready` se era o último);
`clearHistory` (limpar histórico) **arquiva, não apaga** — seta `delivery.archivedAt`
(coluna nova, migration `0009`) nas `sent`/`failed` e a listagem filtra
`archivedAt IS NULL`. O ledger é append-only de propósito: a linha `sent`
sobrevive, então a `unique(publicationId,destinationId)` continua barrando reenvio
duplicado ao mesmo destino e o cálculo de uso mensal do plano segue correto (limpar
histórico não zera consumo nem reabre idempotência);
`reorderQueue(orderedIds)` mantém os slots de `dueAt` fixos e só troca qual item
ocupa cada slot (preserva o espaçamento); o server rejeita a lista se qualquer id
não for `scheduled` (fail-closed), então o **web manda só os ids `scheduled`** e
não oferece seta pra cruzar com item `processing` (bug real 2026-07-12: com um
item "enviando…" na fila, reordenar os demais 409-ava sempre). UI: setas ↑/↓
(swap) + ✕ na aba Fila, otimista com pausa no auto-refresh durante a ação.

Nota dashboard (Início, `/`): tela inicial com métricas derivadas do banco — NÃO é
infra nova. `GET /dashboard?range=day|week|month|year` (`features/dashboard/`)
devolve `{ sent, pending, groups, failed, series }`. `pending` = deliveries
`scheduled|processing` (estado atual, ignora range); `groups` = destinations
`enabled`; `sent` conta por `sentAt`, `failed` por `createdAt` (falha não seta
`sentAt`) dentro da janela. `buckets(range, now)` gera os baldes em hora local do
operador (tool local): day=24h/hora, week=7d/dia (default), month=30d/dia,
year=12m/mês; `buildSeries` conta eventos por balde (scan O(eventos×baldes), ok pro
volume de um operador). TDD do bucketing em `tests/features/dashboard/`. Web:
`routes/dashboard.tsx` (`useQuery(["dashboard", range])`), `ToggleGroup` de range +
4 `Stat` cards + `DashboardChart` (shadcn chart / **Recharts**, barras sent/failed).
Nova oferta virou `/new`; a extensão abre `webUrl + "/new"` no handoff de captura
(o poll de `/deals/capture` mora no `NewOffer`, não no dashboard).

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

Nota SPA (rotas + state stack): o web deixou de trocar de "aba" por `useState` e
passou a ter **rotas reais** (URL, back/forward, deep-link). Quatro libs
first-party, cada uma resolvendo um atrito concreto do código atual (não é
scaffolding "for later" — foi decisão explícita do operador visando o futuro com
auth/usuários):

- **React Router (data mode, v8):** `main.tsx` monta `createBrowserRouter` +
  `RouterProvider` (de `react-router/dom`) dentro de `ThemeProvider` →
  `QueryClientProvider`. `routes/layout.tsx` = shell (header + `NavLink` +
  `Outlet` + `<Toaster>` do Sonner); rotas filhas `/`=Início (Dashboard),
  `/new`=Nova oferta, `/queue`, `/history`, `/settings`. **Paths sempre em inglês**
  (mesmo com a UI em pt); os
  labels do `NavLink` ficam em pt. Matou o `tab` state, o `refreshKey` e o
  `goQueue` (agendar dispara `toast` + `invalidateQueries(["queue"])` +
  `navigate("/queue")`). Data mode, NÃO framework mode (é SPA client-only local;
  framework mode brigaria com Vite/Tailwind sem ganho). Upgrade p/ major seguinte
  = só `bun add react-router@latest`.
- **TanStack Query:** todo server-state via `useQuery` (`refetchInterval`) +
  `useMutation` (`invalidateQueries`/optimistic com `onMutate`/rollback). Apagou o
  `usePolling` (hook removido), o `refreshKey` e o boilerplate de
  `useState`+`busy`-ref+`error` repetido por tela. `queryClient` em `lib/query.ts`
  (`retry:false`, `refetchOnWindowFocus:false` — fail-fast, fiel ao local). Keys
  compartilhadas dedupam: `["wa-session"]` (status+config do WhatsApp),
  `["destinations"]` (nova-oferta + grupos-config); mais `["queue"]`, `["history"]`,
  `["capture"]`, `["settings"]`.
- **Sonner (toast, shadcn):** `components/ui/sonner.tsx` (`<Toaster>` no layout;
  o `useTheme` foi religado do `next-themes` pro nosso `theme-provider` — sem
  `next-themes`). Toasts via `import { toast } from "sonner"` →
  `toast.success/error`. Substituiu o toaster à mão + o `useUiStore` (removidos).
  Qualquer rota levanta toast (settings salvo, erros de mutation da fila/import).
- **Zustand:** ganhou consumidor real (2026-07-12): `store/draft.ts`
  (`useDraftStore`) guarda o rascunho da nova oferta (`input`, `form`,
  `mintedFor`) **em memória** — navegar entre rotas preserva o digitado e não
  re-dispara o auto-mint; refresh limpa tudo (era `localStorage` antes: persistia
  além da conta e re-abria a aba do ML a cada visita ao `/new`). Complemento:
  `useUnsavedWarning(dirty)` (`lib/hooks.ts`, `beforeunload` nativo) avisa antes
  de sair com form sujo — no `/new` (form sem publicação salva) e na Config
  (`isDirty` do TanStack Form; o submit faz `form.reset(value)` pra zerar o
  dirty após salvar).
- **TanStack Form + shadcn `Field`:** o form de **Config** (`SettingsForm`,
  montado após o `useQuery(["settings"])` resolver p/ ter `defaultValues`) usa a
  integração shadcn↔TanStack Form: `form.Field` ligado às primitives `Field`/
  `FieldLabel`/`FieldError` (`ui/field`) e `InputGroup`/`InputGroupAddon` (`ui/
input-group`, o prefixo `min`/`R$` nativo — sem hack de `pl-`). Validators
  funções (sem zod): `min>0`, `max≥min`, template contém `{link}` — `FieldError`
  inline + `canSubmit` desabilita o Salvar. O form da nova-oferta ficou de fora
  de propósito (god component de ~15 `useState`; precisa **decompor** antes).
- **Segurança:** essas libs são estrutura/DX de client — NÃO adicionam segurança.
  O backend continua a fonte de verdade e valida na fronteira (fail-closed); um
  client manipulado chama a API do jeito que quiser. Better Auth **já é** o
  boundary de auth, server-side (ver Nota auth/tenancy). Ver Nota segurança e
  §Restrições.
- Follow-ups (ponytail, adiado): code-split por rota (`lazy` do Router — bundle ~734KB
  hoje, ok p/ tool local); migrar o god component da nova-oferta p/ TanStack Form
  depois de decompô-lo.

FUTURO (parcialmente entregue): a fundação **auth + workspace multi-tenant** já
existe (users, sessão, workspaces com membros/convites/roles, `workspaceId` da
sessão — ver Nota auth/tenancy). Sub-projetos multi-tenant que ficam pra depois,
cada um seu próprio ciclo: **múltiplos números de WhatsApp POR workspace** (o
gateway já é multi-sessão — um número por workspace; vários números no MESMO
workspace é que fica pra depois), **múltiplas contas ML + nichos** (hoje uma tag
de afiliado por workspace), **pagamento/billing** (SaaS — planos/tiers/trial já
existem, ver Nota planos/tiers; falta Stripe/checkout/upgrade) e **split da landing
page**. Ordem/escopo abertos; construir sem fechar essas portas.

Nota extensão de captura (Slice E, `apps/extension/`): extensão MV3 que roda no
`mercadolivre.com.br` logado do operador. **Refatorada de JS puro pra Extension.js
(extension.js.org, MIT — build via Rspack) + React + TS** (2026-07-15), integrada ao
monorepo como `@dealflow/extension`. Reúsa o design system: o **popup**
(`popup/popup.tsx`) é React com os primitives `@dealflow/ui` (`Field`/`Input`/
`Checkbox`) + `@dealflow/ui/styles.css` (Tailwind v4 via `@tailwindcss/postcss`, não
o plugin Vite do web — mesma `globals.css`/`@source`, verificado no build: tokens e
utilitários compilam), consistente com o app. O **content script** da página ML
(`content/mercadolivre.tsx`) também reúsa o design system: o botão flutuante é o
shadcn **`Button`** (`@dealflow/ui/button`) montado por React num **shadow root**
(`attachShadow`), dimensionado como FAB via className (`size={null}` desliga o size
compacto do app; tamanho vem só de padding — `px-6 py-4 text-xl`, sem `h-` — pois
flutua numa página cheia) — o shadow isola o reset do
Tailwind da página de terceiro e vice-
versa, e como o `styles.css` compilado escopa os tokens em `:root, :host` o `:host`
do shadow os recebe (verificado no build). O CSS é o mesmo `action/index.css`
compilado do popup, exposto em `web_accessible_resources` p/ o ML e injetado no
shadow via `fetch(chrome.runtime.getURL(...))` (o content script **não** injeta CSS
na página — `content_scripts[].css` fica `[]`); dark mode = wrapper `.dark` no shadow
seguindo `prefers-color-scheme` (antes era um botão plano com hex hardcoded — trocado
p/ consistência visual). O tipo
`ExtractedDeal` vem de `@dealflow/shared` (não mais copiado à mão); o validador de
URL `isMercadoLivreProduct` (antes `shared.js` global) virou `content/ml-url.ts`
(importado por `background.ts` e `content/bridge.ts`; TDD em `tests/ml-url.test.ts` —
o `@dealflow/shared` segue **só tipos**, o validador é interno da extensão pois só
ela o usa). Reconhece três formatos de produto: `/p/MLB…`, `/up/MLBU…` e o antigo
`produto.mercadolivre.com.br/MLB-<id>-slug` (esse último faltava e o botão não
aparecia nele — o `productId` do content script casa os três e normaliza pro mesmo
`externalId` que o `mlbIdFromUrl` do server, pra o `mergeCapture` bater). O content
script é dividido por responsabilidade: `content/ml-page.ts` = adapter da página ML
(`productId`, `scrape`, `affiliateLink`, `capture` — leitura do DOM + API de afiliado);
`content/mercadolivre.tsx` = o widget (o `Button` React + mount no shadow root + poll
`sync` de 1s). `manifest.json` é a fonte de entrypoints (referencia `.ts/.tsx`); build
`bun run --filter '@dealflow/extension' build` → `dist/` (gitignored) load unpacked;
`start` (= `extension dev`, HMR) fica **fora** do `bun run dev` raiz (abre browser
próprio, briga com a regra "nunca subir dev server"). `extension-env.d.ts` é
auto-gerado (traz `chrome`/`*.css`); `env.d.ts` reforça o `declare module "*.css"`
(o subpath do package resolve pro arquivo real e sombreia o wildcard do
extension/types). O botão flutuante "Capturar oferta" na página de produto
(`/p/MLB…`); ao clicar ele: gera O NOSSO
`meli.la` (ver Nota geração do link de afiliado), raspa título/imagem/De/Por do
DOM+JSON-LD (a página logada não é anti-botada, o preço vem completo), monta um
`ExtractedDeal` e manda pro `background.ts`, que faz `POST /deals/capture` na API
(fora do content script pra escapar do CORS). A captura também envia a
`affiliateTag` lida no mint (`{ draft, affiliateTag }` no body) e a API a adota
em `settings.mlAffiliateTag` **só quando está vazio** (`adoptAffiliateTag`,
testado: nunca sobrescreve tag configurada) — o operador não digita a etiqueta;
a primeira captura preenche. O body é validado na fronteira (`sanitizeDraft`,
testado): `affiliateUrl`/`sourceUrl` exigem http(s) ≤1000 chars (senão 400),
campos opcionais malformados são **descartados** em vez de rejeitar o draft
(imagem só CDN mlstatic via `isTrustedImageUrl`, strings com cap, preços
numéricos finitos) — robusto a mudança do ML sem armazenar lixo. A API guarda o
draft num slot único
em memória (`features/deals/capture/route.ts`, ponytail: handoff transiente numa
máquina; virar tabela se precisar sobreviver a restart) e o `background` foca/abre
a aba do Dealflow. O web "Nova oferta" faz poll de `GET /deals/capture` (consome e
limpa); com o form vazio já preenche, com edição em andamento mostra um banner
"Carregar" (não sobrescreve). Isto é a `ExtensionSource` na prática e **supera o
S6 PlaywrightSource** como aquisição de preço (sem browser pesado, sem guerra
anti-bot, roda na sessão real do usuário). Verificado ao vivo: geração do link e
raspagem na conta logada, e o handoff da API por teste + curl. Config no popup
(apiUrl, webUrl, apiKey em `type=password`) em `chrome.storage.local`, salvos no
`onChange` (não no blur — o popup fecha ao clicar fora e o blur se perdia). Popup
segue o `prefers-color-scheme` (`.dark` no `<html>`, senão renderiza claro). O
`content/mercadolivre.tsx` re-monta o botão
via poll idempotente de 1s (o ML é SPA — o content script só injeta no load; sem o
poll o botão sumia ao navegar client-side, batia com "sumiu depois de 10 min").
Auto-mint do afiliado (fail-closed): quando o import cai sem afiliado (mensagem de
concorrente / URL de produto crua), o mint acontece **automático no paste, em
background** — sem clique nem aba visível. Por que não cookie/servidor: verificado ao
vivo (2026-07-11) que o preço mora só no HTML SSR anti-botado (não há endpoint JSON
de preço; fetch server-side, mesmo do IP residencial, cai em 302 `/gz/account-
verification`), então re-verificar preço exige um browser real logado — cookie não
passa (o bloqueio é fingerprint de browser, não login). Logo, o browser real da
extensão continua sendo o transporte; só matamos o bate-e-volta visível. Fluxo: um
content script-ponte (`content/bridge.ts`, injetado no origin do web via `content_scripts`)
faz relay `window.postMessage('dealflow'/'mint') ↔ chrome.runtime`; o web, ao ver
`needsAffiliate|needsPrice` **e** a extensão presente (handshake ping/pong; guarda por
`externalId` p/ não repetir), pede o mint; o `background.ts` abre a página do produto
com `chrome.tabs.create({ active:false })` (aba em background, sem roubar foco), o
`content/mercadolivre.tsx` roda igual (vê `#dealflow-auto` → mint no contexto logado + raspagem →
handoff por `/deals/capture`), e o background **fecha a aba** ao receber o capture
dela (sem trocar o foco; timeout de 30s fecha se o mint falhar — ponytail: sem
streaming de erro fino). O web, que já dá poll no slot, casa o produto por MLB id e faz
`mergeCapture` (ver Nota reconhecer link próprio + re-verificar: puxa tudo do ML —
sobrescreve preço/título/imagem, mantém o cupom digitado, cola o afiliado novo;
produto diferente → banner "Carregar"). Sem extensão: `hasExt` fica falso, o auto-mint
não dispara e o botão "Abrir no ML e gerar meu link" (`window.open` do hash) segue como
fallback manual. Reusa o pipeline de captura já testado ao vivo, em vez de fetch no
service worker (cookies do ML no SW = incerto). 100% sem browser fica pro
`MlApiSource`/OAuth (quando o ML liberar; datacenter/VPS é o IP mais bloqueado, então
cookie server-side não porta pro SaaS de qualquer forma).

Roadmap: S1 importar URL ✅ → S2 criar publicação ✅ → S3 WhatsApp ✅ → S4
importar mensagem ✅ → S5 dashboard + fila/agendamento + config ✅ (inclui
reordenar/cancelar fila e template de mensagem personalizável) → Slice E extensão
de captura (link de afiliado + preço automático) ✅ → Fundação auth + tenancy
(better-auth, workspaces/membros/roles, isolação por workspace) ✅.

Próximos passos:

- **`MlApiSource` (API oficial), quando o suporte do ML liberar a conta:** OAuth do
  usuário, caminho paralelo à extensão (que fica como fallback permanente pra quem
  tiver a mesma restrição `USER_BLOCKER`). `PlaywrightSource` fica arquivado — a
  extensão já resolve o preço sem browser pesado.
- **Endurecer a fila:** retry de `failed` na UI; anti-rajada no restart (respeitar
  o espaçamento mesmo nos vencidos acumulados).
- **Split aquisição ↔ orquestração (pré-SaaS):** preparar a troca do
  `ProductSource` local por extensão/API quando for pra VPS.
- **Pagamento sobre a fundação de planos (ver Nota planos/tiers):** `@better-auth/stripe`
  (checkout, portal, webhooks que escrevem `settings.plan`), upgrade/downgrade/
  cancelamento, e a página de pricing da landing consumindo `PLANS` (expor `GET /plans`
  catálogo quando a landing existir). Enforcement de nºWhatsApp/contas ML entra junto
  com as features multi.

NORTE (visão do usuário, longo prazo): **automação 100% da escolha de produto** —
o sistema descobre e seleciona ofertas sozinho, sem o operador colar link ou
garimpar. Isso reformula `Signal` de "URL colada" para "descoberta automática"; o
humano decide só o que publica ("a automação assiste, o humano decide" levado ao
limite). Toda a estrutura (Signal → Product → DealSnapshot → …, fronteiras,
fila) já aponta pra esse fim — construir sempre sem fechar essa porta.

Nota packages/ui (`@dealflow/ui`): o design system reutilizável foi extraído de
`apps/panel` pra um package próprio, consumido como **source `.tsx` sem build**
(igual ao `@dealflow/shared`). Contém SÓ o global/reutilizável: os primitives
**shadcn** (`src/components/ui/*.tsx`), `theme-provider` + `mode-toggle` (o `sonner.tsx`
depende do theme-provider, por isso vai junto), o `cn` (`src/lib/utils.ts`) e o
tema (`src/styles/globals.css`) — **nada** de peça de feature (essas ficam em
`apps/panel/src/components/`). As deps do design mudaram pra cá (`@base-ui/react`,
`class-variance-authority`, `clsx`, `tailwind-merge`, `recharts`, `shadcn`,
`tw-animate-css`, `@fontsource-variable/*`; `@phosphor-icons/react` e `sonner`
ficam também no web porque o feature-code os importa direto; `react`/`react-dom`
são `peerDependencies`). Motivo: uma futura **landing page** reusa tudo sem
reinstalar o design system. Consumo (exports map em `package.json`):
`@dealflow/ui/<primitive>` (wildcard `./*` → `src/components/ui/*.tsx`),
`@dealflow/ui/{theme-provider,mode-toggle}`, `@dealflow/ui/lib/utils` (o `cn`),
`@dealflow/ui/styles.css`. O `@/` NÃO existe no BUILD do package (o alias `@`→`src` do web resolveria pra
`apps/panel/src`) — os arquivos consumidos usam **import relativo**. **`components.json`
(shadcn) vive no package** (aliases apontam pros dirs reais: `ui`→`@/components/ui`,
`utils`→`@/lib/utils`; `paths @/*→./src/*` no `tsconfig` só pro CLI resolver):
`bunx shadcn add` daqui em diante escreve os primitives em
`packages/ui/src/components/ui/`, mas os imports `@/…` que ele gera precisam virar
**relativos** à mão (o web é quem dona o `@`) — mesmo passo manual do estilo
base-lyra. **Os primitives MORAM em `components/ui/` de propósito**: o
`.prettierignore` (`**/components/ui/`) só casa esse caminho, e base-lyra é
**sem ponto-e-vírgula** — fora de `components/ui/` o `prettier --write .` os
reformata (semicolons/trailing commas), fugindo do registry. Restaurados do estado
pristine pré-extração (`apps/panel/src/components/ui`, que era prettier-ignored) só
com o fix de import relativo, nunca via prettier. **Gotcha Tailwind v4**: v4 varre o module graph mas
**ignora `node_modules`**, e um workspace package é symlinkado lá — sem ajuste os
primitives saem sem estilo. Fix: `@source ".."` no `globals.css` (varre
`packages/ui/src`, relativo ao arquivo CSS). O `src` do próprio web continua
auto-detectado pelo plugin do web; cada app futuro (landing) tem seu próprio
`@tailwindcss/vite` + importa `@dealflow/ui/styles.css` (padrão v4 monorepo).

Nota config/env (2026-07-15): local não exige `.env` — tudo cai em defaults de
`localhost` no código (URL/porta hardcodada local é OK, decisão do operador). A
config toda vive em env pra hospedar sem caçar valor: `HOST`/`PORT` (api),
`WA_GATEWAY_HOST`/`WA_GATEWAY_PORT` (gateway), `BETTER_AUTH_URL`/
`BETTER_AUTH_SECRET`/`TRUSTED_ORIGINS`/`WA_GATEWAY_URL`/`DATABASE_URL` (api),
`VITE_API_URL` (web, injetada no build). Nenhuma URL se troca no código pra
hospedar — todas são `process.env.X ?? "<default localhost>"`; subir em
`meudominio.com` = preencher o `.env` (`BETTER_AUTH_URL`/`TRUSTED_ORIGINS`/
`VITE_API_URL` = seu domínio; `WA_GATEWAY_URL` fica interno 127.0.0.1). **Origens
confiáveis separam dev de prod** (`shared/auth/trusted-origins.ts`): os localhost
de dev/preview (`5173`/`4173`) só entram na allowlist quando
`NODE_ENV!=="production"`; em prod confia **só** no `TRUSTED_ORIGINS` (fail-closed —
esquecer de setar bloqueia o web, avisando que faltou config). Os dois `localhost`
que NÃO são URL e não se trocam são os `Set(["127.0.0.1","localhost","::1"])` que
definem loopback pros guards de segurança. **Um `.env` na raiz**, mas cada app tem
que ser apontado pra ele: o Bun só auto-carrega `.env` do **cwd**, e
`bun run --filter '*' dev` roda cada app com cwd = a pasta do workspace
(`apps/api`, `apps/wa-gateway`) — NÃO sobe pra raiz. Logo os apps **não** herdam o
`.env` da raiz sozinhos (bug real 2026-07-17: `SELF_HOST`/`BETTER_AUTH_SECRET` do
`.env` nunca chegavam na api — ela caía nos defaults; o warning de low-entropy do
better-auth era o sintoma). Fix: os scripts `dev`/`db:migrate` de api e gateway
usam **`bun --env-file=../../.env ...`** (relativo ao cwd do app = `.env` da raiz;
`--env-file` ausente não quebra — Bun ignora silenciosamente, então local sem
`.env` continua caindo nos defaults). O web lê os `VITE_*` do MESMO arquivo via
`envDir: "../.."` no `vite.config.ts` (senão o Vite só olharia `apps/panel`). Portas:
api e gateway carregam o mesmo `.env`, então NÃO podem compartilhar `PORT` — o
gateway usa `WA_GATEWAY_PORT` (nome distinto, senão colidiriam em 3001). Mudou o
`.env`? **Reiniciar o dev** (Ctrl+C + `bun run dev`) — `--watch` recarrega só
código-fonte, nunca relê o `.env`. `.env.example`
(commitado — `!.env.example` no `.gitignore`, que ignora `*.env*`) lista tudo com
os defaults; hospedar = `cp .env.example .env` e ajustar. A extensão é artefato de
browser: seus defaults (`apiUrl`/`webUrl`) ficam hardcoded e são sobrescritos no
popup (chrome.storage), não por env.

Nota lint (2026-07-18): o lint é **type-aware** — `ts.configs.recommendedTypeChecked`

- `parserOptions.projectService` + `sonarjs.configs.recommended` (SonarSource, as
  mesmas regras do SonarLint da IDE). Escopo e exceções, todas deliberadas:

* **`**/components/ui/**` é ignorado** (primitives shadcn do registry, mesma regra
  do `.prettierignore` — reformatá-los faria drift do registry).
* **`packages/tests/**` e `*.config.{js,ts}` rodam sem type-aware**
  (`disableTypeChecked`): os tsconfigs dos testes são `tsconfig.<escopo>.json`, que
  o `projectService` não acha (ele procura `tsconfig.json`). Testes mantêm as regras
  sonarjs não-tipadas. **`sonarjs/async-test-assertions` fica LIGADO** — foi ela que
  pegou 3 `expect(...).rejects` sem `await` (ver Nota testes). Desligados só em teste:
  skipped, float equality, senha fake, `/tmp`, http, IP hardcoded (o teste de
  `isPublicIp` assere sobre IPs literais de propósito).
* **`sonarjs/no-inconsistent-returns` fica OFF** (é off no profile do Sonar também):
  briga com o contrato `Response | void` do middleware Hono e dos handlers React.
* **`only-throw-error` aceita `Response` no web** (`allow: [{from:"lib",name:"Response"}]`)
  — `throw redirect()` é o idioma documentado dos loaders do React Router.
* Um único `eslint-disable` no projeto: o regex `PRICE` de `message.ts`, apontado como
  super-linear. **Medido linear até 100k chars** (as classes `[\d.]` e `,` são
  disjuntas → sem backtracking); apertar o regex mudaria o parsing documentado
  (`"R$ 1.2"` → 1.2 viraria 1).
* Regras da IDE que o plugin ESLint não tem (ex.: **S7776**, "use `Set`+`has()`") não
  aparecem no `bun run lint` — se o SonarQube da IDE apontar algo que o lint não pega,
  é isso; corrigir à mão.

Nota testes (2026-07-15): a suíte deixou o `bun test` colocado por app e virou um
package próprio, `@dealflow/tests` (`packages/tests`), com **Vitest** (unit) +
**Playwright** (e2e). Decisão do operador (sobrepõe a antiga regra "tests
espelham src"): centralizar tudo num lugar. Layout por alvo:
`packages/tests/{api,web,wa-gateway,extension}` (unit, migrados 1:1 do
`bun:test` → `vitest` — só troca de import, zero mudança de lógica),
`packages/tests/support` (o `FakeMessaging` e helpers), `packages/tests/e2e`
(Playwright).

- **Vitest roda SOB o runtime do Bun** (`bun run --bun`, ver script `test`) —
  obrigatório porque `apps/api/src/shared/db.ts` importa `bun:sqlite`, builtin
  que só existe no Bun; workers de Node quebram. Formas que NÃO funcionam:
  `bun run vitest` procura um _script_ chamado vitest, e `bunx vitest` baixa uma
  cópia avulsa pro /tmp com resolução quebrada — sempre o bin local sob
  `--bun`. Config: `vitest.config.ts` com
  `test.projects` (um por app), cada um com seu **próprio** alias `@` (o `@` de
  cada app aponta pra src diferente — api e wa-gateway têm ambos `@/app`, então
  NÃO dá pra compartilhar um alias só). `@support` → `packages/tests/support`.
  DB de teste é `:memory:` (via `NODE_ENV=test`). Deps que os testes importam
  direto (`drizzle-orm`, `hono`) e os tipos (`@types/bun`, `@types/node`) moram no
  `package.json` do `@dealflow/tests`; imports do src dos apps se resolvem
  sozinhos (relativos ao arquivo, caem no `node_modules` do app).
- **Typecheck**: um `tsconfig.<escopo>.json` por projeto (api/wa-gateway/
  extension/panel/e2e), cada um com o `@` certo — um tsconfig único não resolveria
  o `@` ambíguo. O script `typecheck` encadeia os cinco `tsc -p`.
- **Playwright e2e** (`playwright.config.ts`): sobe **API real + SQLite real +
  web real buildado** (não o dev server — `vite build && vite preview` em porta
  própria 4321; api em 3011), e só **fakeia os dois boundaries externos** que
  não rodam em sandbox (ver §Restrições e Notas ML/Baileys): `ProductSource`
  (ML) e `MessagingProvider` (WhatsApp). Os fakes são **env-gated dentro dos
  próprios módulos reais** (`integrations/mercado-livre/source.ts` →
  `DEALFLOW_FAKE_ML`; `integrations/whatsapp/gateway.ts` → `DEALFLOW_FAKE_WA`;
  ambos exigem também `NODE_ENV !== "production"` — fail-closed: um fake nunca
  ativa em produção mesmo com a flag ligada), sem tocar nas rotas — o caminho
  rota→use-case→DB é 100% exercitado. O fake do ML devolve HTML com JSON-LD que
  o parser real parseia de verdade; o fake do WhatsApp é um gateway in-memory
  (connect/listGroups/send). `DEALFLOW_E2E=1` (no `apiEnv` do harness) desliga o
  rate-limit do better-auth (o polling de sessão do e2e estouraria o 10/60s) —
  flag dedicada de propósito, pra `NODE_ENV` sozinho nunca desabilitar proteção;
  `DATABASE_URL=:memory:` fica explícito no mesmo `apiEnv`. Cobertura atual: auth (guard, signup+
  onboarding, logout/re-login), jornada de receita (importar → **invariante
  fail-closed: produto colado nunca traz afiliado** → operador cola o nosso →
  salvar → sincronizar grupos → enviar → `sent`), e agendar → fila. Browser:
  `bunx playwright install chromium` (headless-shell, ~114MB, cacheado).
- Essas libs são first-party (Vitest = time do Vite; Playwright = Microsoft);
  substituem o `bun test` como runner único do projeto.
- **`expect(promise).rejects` SEM `await` não assere nada** — o teste passa mesmo
  se a promise resolver. Três invariantes (import rejeita URL de marketplace não
  suportado / sem URL; send rejeita publicação inexistente) estavam assim, achadas
  pelo `sonarjs/async-test-assertions`. Sempre `await expect(...).rejects`.
  O override de sonarjs pra `packages/tests/**` desliga só ruído de teste
  (skipped, float equality, senha fake, `/tmp`, http) — **nunca**
  `async-test-assertions`, que pega bug real.

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
- **Web (`apps/panel/src`) por responsabilidade, não por página:** primitives
  **shadcn** (`Button`, `Field`, `Input`, `Card`, `sonner`, `tooltip`…) vêm de
  `@dealflow/ui` (ver Nota packages/ui), não mais de `components/ui/`;
  `components/` (peças de feature, ex.:
  `new-offer/{import,review,send}-panel`, `queue-row`, `whatsapp-status`; `Panel`
  = wrapper de `Card`; a prop `hint` (`ReactNode`) vira um **ícone de ajuda com
  `Tooltip` shadcn** ao lado do título — não texto inline sempre-visível. Regra
  de UI: sem labels/descrições redundantes; só o essencial visível, o resto
  atrás do ícone de ajuda. `TooltipProvider` mora no `layout`), `lib/`
  (`env`/`api`/`format`/`offer`/`query`/`hooks` + barrel; o `cn`/`utils` mudou
  pra `@dealflow/ui/lib/utils`),
  `types/`, `routes/` (um arquivo por rota + `layout.tsx`;
  só orquestração: estado + handlers; JSX grande vira componente com props),
  `store/` (Zustand — hoje só `draft.ts`, rascunho da nova oferta).
  **Barrel `index.ts` em cada pasta.** Header: duas linhas — logo + direita
  enxuta (workspace truncado, WhatsApp ícone+bolinha com Popover, tema, avatar);
  em mobile (`sm:` pra baixo) as tabs colapsam num `DropdownMenu` ☰
  (`MobileNav` no `layout.tsx`). Gotcha do base-lyra: `DropdownMenuContent` tem
  `w-(--anchor-width)` — menu ancorado em botão-ícone clipa o conteúdo
  (`overflow-x-hidden`); passe `className="w-auto"` nesses casos (user-menu,
  workspace-switcher).
- **Contratos-fio em `@dealflow/shared`** (`ExtractedDeal`, `DeliveryResult`,
  `QueueItem`, `Settings`; também `PageMessage`, o protocolo `postMessage`
  web↔extensão — cruza o fio, então mora aí, tipado uma vez pros dois lados):
  o que atravessa o HTTP mora aí e é importado de
  `@dealflow/shared` — **sem shim/barrel local de re-export**. No fio datas são
  `string`; o servidor deriva a variante com `Date` via
  `Omit<QueueItem,"dueAt"|"sentAt"> & { dueAt: Date | null }`. NÃO confundir com
  `apps/api/src/shared/` (infra server-only cross-feature: `db`, `schema`,
  `messaging`, `money` — não cruza fronteira app↔app). A extensão (Extension.js +
  TS) importa os tipos de `@dealflow/shared` direto (ex.: `ExtractedDeal`), não mais
  copiados à mão (ver Nota extensão de captura).

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

## Regras permanentes

- **NUNCA iniciar servidor de dev** (`bun run dev`, `vite`, `bun --watch`, API,
  web, wa-gateway) — o dev cuida disso e já deixa rodando. Para verificar no
  browser, use a instância que o dev tem no ar; se estiver fora, peça pra ele
  subir. Se você subiu algum processo por engano, mate só o seu (confira PID/porta)
  e nunca reinicie.
- **Preferir soluções oficiais/first-party** ao escolher dep, plugin ou tool.
  Nomeie quem mantém; sinalize third-party e ofereça a alternativa oficial
  primeiro. Ordem: oficial > third-party > poucas linhas à mão — mas dep nova de
  qualquer tipo ainda exige problema real (casa com ponytail). Ex.: mantido só o
  `eslint-plugin-react-hooks` (React team), rejeitado `eslint-plugin-react-refresh`
  (terceiro).
- **Ao finalizar uma task, sincronizar memória → este `CLAUDE.md`.** Tudo que
  virou memória durante a task (fatos, feedback, decisões, referências) tem que
  ser incorporado aqui antes de considerar a task concluída. Memória é rascunho;
  este arquivo é a **ÚNICA** fonte de verdade versionada — o antigo
  `.claude/memory/` foi absorvido aqui (2026-07-19) e **não deve ser recriado**.
  Vale para toda task futura.
- **Ao finalizar, lembrar o operador de rodar `/simplify` e `/code-review` antes
  de commitar** — entrega mais precisa e eficiente antes de publicar (o repo é
  público). É um lembrete ao humano, não algo que o Claude dispara sozinho.

## Convenções do projeto

- **Testes** vivem **centralizados** em `packages/tests` (`@dealflow/tests`),
  espelhando o alvo por subpasta (`api/`, `web/`, `wa-gateway/`, `extension/`,
  `e2e/`), **não** colocados por app. Ex.: `packages/tests/api/app.test.ts`. Ver
  Nota testes.
- **Path alias** `@/*` → `src/*` (tsconfig + Vite; api e web). Use `@/` para
  traversal de pai; mantenha `./irmão` na mesma pasta (mais legível que
  `@/features/.../use-case`). Contrato cross-app vem de `@dealflow/shared`.
- **Barrel `index.ts`** por pasta (`ui`, `components`, `hooks`, `lib`, `types`,
  `tabs`) — importa-se a pasta, não o arquivo.
- **Verificar no browser** (app rodando) toda feature nova antes de commitar —
  teste verde não prova comportamento ponta-a-ponta. Refactor type-only/config
  dispensa (typecheck+lint+test+build cobrem).
- **Sem comentários** no código. Nomes explícitos falam por si. Isso vale inclusive
  para os `ponytail:` que marcam simplificação deliberada: o **conhecimento vai pro
  `CLAUDE.md`** (fonte de verdade versionada), o comentário não fica. Marcador em
  `catch` vazio também não: reestruture (`catch { continue; }`,
  `.catch(() => undefined)`) em vez de comentar.
- **shadcn-first (web):** sempre usar componentes shadcn; **verificar o registro
  antes de criar um à mão** (`https://ui.shadcn.com/docs/components`). Só criar
  componente próprio quando compõe várias coisas que o shadcn não dá pronto — e
  ainda assim por cima das primitives shadcn, nunca reimplementando input/label/
  toast/form etc. `bunx shadcn@latest add <nome>` (o prompt de sobrescrever é
  interativo; se travar, pegar o arquivo do registro `.../r/styles/base-lyra/
<nome>.json` e trocar os imports `@/registry/base-lyra/…` → `@/…`).
- **Sem hacks de espaçamento:** nada de `pl-`/margens ou paddings negativos
  (`-mb-px` etc.) em itens. Espaço sempre em container via `padding`/`gap`
  (flex/grid). Prefixo de input = `InputGroupAddon` do shadcn, não `pl-`.
- **Prettier** manda na formatação; **ESLint** na qualidade (não acoplados).
- **Commits** em inglês, minúsculos, uma linha, poucas palavras, convencionais
  (`feat:`, `chore:`, `docs:`, `fix:`...). Ex.: `feat: add web app`. Sem trailer
  `Co-Authored-By` e **sem body** — mudança grande demais pra uma linha é sinal
  de **split por concern** em vários commits: agrupar por camada/feature,
  `git add <paths>` explícito por grupo, ordenados pra cada commit intermediário
  ainda passar typecheck/test (contrato shared + api antes do web que consome).
  Reescrever histórico já pushado (repo solo): `git reset --soft`, re-commitar
  em grupos, `git push --force-with-lease`, conferindo árvore final idêntica
  (`git diff <old> <new> --quiet`).
- Mudanças pequenas e executáveis. Sem scaffold vazio antes de comportamento.

## Comandos

```sh
bun run setup      # install + db:migrate + build (single-command onboarding)
bun run dev        # web (vite) + api (:3001) + wa-gateway (:3002); extension fica fora (abre browser próprio)
bun run build      # tudo que builda: web + extensão
bun run preview    # preview do buildado: web
bun run web:dev / web:build / web:preview   # só o web
bun run api:dev                             # só a api
bun run gateway:dev                         # só o gateway
bun run extension:dev / extension:build     # extension:dev (HMR) fica fora do dev raiz
bun run lint
bun run typecheck
bun run test        # vitest (unit), sob o runtime do Bun (bun:sqlite)
bun run test:watch  # vitest em watch
bun run test:e2e    # playwright (e2e); sobe api+web de teste em portas próprias
bun run format
bun run db:generate   # gera migrations após mudar o schema
bun run db:migrate    # cria/migra o dealflow.db sem subir a api
```

DB local em `dealflow.db` (raiz da api, ignorado no git); override via
`DATABASE_URL`.
