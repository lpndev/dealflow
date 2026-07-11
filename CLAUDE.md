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
  (ver Nota segurança): hoje o modelo é local (`127.0.0.1`, sem auth); ao expor
  qualquer superfície a entrada não confiável, endurecer antes (validar na
  fronteira, sem SSRF, sem vazar dados de um operador pra outro).

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
- **Web:** React + Vite + Tailwind v4 (`@tailwindcss/vite`) — `apps/web`.
  UI **shadcn/ui** (base-lyra, phosphor). Rotas reais com **React Router (data
  mode)**, server-state com **TanStack Query**, toasts com **Sonner** (shadcn),
  forms com **TanStack Form** ligado às primitives `Field` do shadcn; **Zustand**
  instalado e ocioso (staged p/ estado global futuro) (ver Nota SPA)
- **API:** Hono + Bun (porta 3001) — `apps/api`
- **Shared:** `@dealflow/shared` (`packages/shared`) — contratos-fio cross-app,
  só tipos, consumido como source `.ts` (sem build)
- **Qualidade:** TypeScript strict, ESLint (flat, + `eslint-plugin-react-hooks`
  oficial no web — nada de plugins de terceiro), Prettier (+
  `@ianvs/prettier-plugin-sort-imports` e `prettier-plugin-tailwindcss`),
  `bun test`

Fronteiras previstas (interface só quando separa dependência externa real):
`ProductSource`, `AffiliateLinkProvider`, `MessagingProvider`.

## Estado atual

Fundação + Slices 1–5 + import de afiliado (`meli.la`) prontos. `apps/web`,
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

Nota segurança: API e gateway ligam em `127.0.0.1` (uma máquina, um operador);
sem auth por request enquanto local (§17). Gateway valida `imageUrl` só por
protocolo (http/https) — o `imageUrl` vem da oferta do próprio operador e o
gateway é local, então SSRF de IP privado está fora do modelo de ameaça. Se um
dia o gateway aceitar entrada não confiável (SaaS): resolver DNS, bloquear
faixas privadas/loopback/link-local e fixar o IP resolvido no fetch.

Adiado até o slice que usa (nada de decoração):

- **Better Auth** → quando existir rota protegida.

Nota fila/agendamento (S5): a UI é um dashboard de 5 telas (Início / Nova oferta /
Fila / Histórico / Config), hoje **rotas reais** em `apps/web/src/routes/*` (ver
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
- **Zustand:** instalado mas **ocioso** — o toast migrou pro Sonner e não há
  estado global cross-rota hoje. Mantido de propósito (decisão do operador),
  staged pro futuro (sessão/UI global quando auth/usuários chegarem); sem `store/`
  até existir consumidor real.
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
  client manipulado chama a API do jeito que quiser. Better Auth (quando vier) é o
  boundary de auth, e é server-side. Ver Nota segurança e §Restrições.
- Follow-ups (ponytail, adiado): code-split por rota (`lazy` do Router — bundle ~734KB
  hoje, ok p/ tool local); migrar o god component da nova-oferta p/ TanStack Form
  depois de decompô-lo.

FUTURO (marcado pelo usuário, adiado — hoje `workspaceId` é fixo em
`DEFAULT_WORKSPACE_ID`): workspace multi-tenant com nome/logo, múltiplos números
de WhatsApp, múltiplos grupos/nichos. Só quando existir 2+ número de verdade.

Nota extensão de captura (Slice E, `apps/extension/`): extensão MV3 (JS puro, sem
build — load unpacked) que roda no `mercadolivre.com.br` logado do operador.
`content.js` mostra um botão flutuante "Capturar oferta" na página de produto
(`/p/MLB…`); ao clicar (ou automático, via toggle no popup) ele: gera O NOSSO
`meli.la` (ver Nota geração do link de afiliado), raspa título/imagem/De/Por do
DOM+JSON-LD (a página logada não é anti-botada, o preço vem completo), monta um
`ExtractedDeal` e manda pro `background.js`, que faz `POST /deals/capture` na API
(fora do content script pra escapar do CORS). A API guarda o draft num slot único
em memória (`features/deals/capture/route.ts`, ponytail: handoff transiente numa
máquina; virar tabela se precisar sobreviver a restart) e o `background` foca/abre
a aba do Dealflow. O web "Nova oferta" faz poll de `GET /deals/capture` (consome e
limpa); com o form vazio já preenche, com edição em andamento mostra um banner
"Carregar" (não sobrescreve). Isto é a `ExtensionSource` na prática e **supera o
S6 PlaywrightSource** como aquisição de preço (sem browser pesado, sem guerra
anti-bot, roda na sessão real do usuário). Verificado ao vivo: geração do link e
raspagem na conta logada, e o handoff da API por teste + curl. Config no popup
(auto, apiUrl, webUrl) em `chrome.storage.local`. O `content.js` re-monta o botão
via poll idempotente de 1s (o ML é SPA — o content script só injeta no load; sem o
poll o botão sumia ao navegar client-side, batia com "sumiu depois de 10 min").
Auto-mint do afiliado (fail-closed): quando o import cai sem afiliado (mensagem de
concorrente / URL de produto crua), o painel Revisar mostra "Abrir no ML e gerar
meu link" → `window.open(sourceUrl + '#dealflow-auto')`; o `content.js`, ao ver o
hash `dealflow-auto`, força um capture (mint no contexto da página logada — cookies
provados — + raspagem) e faz o handoff normal por `/deals/capture`; o web, que já dá
poll nesse slot, casa o produto por MLB id e faz `mergeCapture` (ver Nota reconhecer
link próprio + re-verificar: puxa tudo do ML — sobrescreve preço/título/imagem, mantém
o cupom digitado, cola o afiliado novo; produto diferente → banner "Carregar"). Reusa
o pipeline de captura já testado ao vivo, em vez de fetch no service worker (cookies
do ML no SW = incerto). Sem extensão/login o campo fica vazio com aviso. Mata o
bate-e-volta de ir ao ML só pra pegar o link; 100% automático fica pro
`MlApiSource`/OAuth.

Roadmap: S1 importar URL ✅ → S2 criar publicação ✅ → S3 WhatsApp ✅ → S4
importar mensagem ✅ → S5 dashboard + fila/agendamento + config ✅ (inclui
reordenar/cancelar fila e template de mensagem personalizável) → Slice E extensão
de captura (link de afiliado + preço automático) ✅.

Próximos passos:

- **`MlApiSource` (API oficial), quando o suporte do ML liberar a conta:** OAuth do
  usuário, caminho paralelo à extensão (que fica como fallback permanente pra quem
  tiver a mesma restrição `USER_BLOCKER`). `PlaywrightSource` fica arquivado — a
  extensão já resolve o preço sem browser pesado.
- **Endurecer a fila:** retry de `failed` na UI; anti-rajada no restart (respeitar
  o espaçamento mesmo nos vencidos acumulados).
- **Split aquisição ↔ orquestração (pré-SaaS):** preparar a troca do
  `ProductSource` local por extensão/API quando for pra VPS.

NORTE (visão do usuário, longo prazo): **automação 100% da escolha de produto** —
o sistema descobre e seleciona ofertas sozinho, sem o operador colar link ou
garimpar. Isso reformula `Signal` de "URL colada" para "descoberta automática"; o
humano decide só o que publica ("a automação assiste, o humano decide" levado ao
limite). Toda a estrutura (Signal → Product → DealSnapshot → …, fronteiras,
fila) já aponta pra esse fim — construir sempre sem fechar essa porta.

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
- **Web (`apps/web/src`) por responsabilidade, não por página:** `components/ui/`
  (primitives **shadcn**: `Button`, `Field`, `Input`, `InputGroup`, `Card`,
  `sonner`, `tooltip`…), `components/` (peças de feature, ex.:
  `new-offer/{import,review,send}-panel`, `queue-row`, `whatsapp-status`; `Panel`
  = wrapper de `Card`; a prop `hint` (`ReactNode`) vira um **ícone de ajuda com
  `Tooltip` shadcn** ao lado do título — não texto inline sempre-visível. Regra
  de UI: sem labels/descrições redundantes; só o essencial visível, o resto
  atrás do ícone de ajuda. `TooltipProvider` mora no `layout`), `lib/`
  (`env`/`api`/`format`/`offer`/`query` + barrel),
  `types/`, `styles/globals.css`, `routes/` (um arquivo por rota + `layout.tsx`;
  só orquestração: estado + handlers; JSX grande vira componente com props).
  **Barrel `index.ts` em cada pasta.** (`store/` só volta quando Zustand tiver
  consumidor real.)
- **Contratos-fio em `@dealflow/shared`** (`ExtractedDeal`, `DeliveryResult`,
  `QueueItem`, `Settings`): o que atravessa o HTTP mora aí e é importado de
  `@dealflow/shared` — **sem shim/barrel local de re-export**. No fio datas são
  `string`; o servidor deriva a variante com `Date` via
  `Omit<QueueItem,"dueAt"|"sentAt"> & { dueAt: Date | null }`. NÃO confundir com
  `apps/api/src/shared/` (infra server-only cross-feature: `db`, `schema`,
  `messaging`, `money` — não cruza fronteira app↔app). A extensão é JS puro sem
  build: segue o contrato à mão.

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
- **Ao finalizar uma task, sincronizar memória → diretrizes permanentes.** Tudo
  que virou memória durante a task (fatos, feedback, decisões, referências) tem
  que ser incorporado às diretrizes permanentes (este `CLAUDE.md` e `.claude/`)
  antes de considerar a task concluída. Memória é rascunho; `CLAUDE.md`/`.claude/`
  é a fonte de verdade versionada. Vale para toda task futura.
- **Ao finalizar, lembrar o operador de rodar `/simplify` e `/code-review` antes
  de commitar** — entrega mais precisa e eficiente antes de publicar (o repo é
  público). É um lembrete ao humano, não algo que o Claude dispara sozinho.

## Convenções do projeto

- **Testes** ficam em `tests/` espelhando `src/`, não colocados. Ex.:
  `apps/api/tests/app.test.ts`.
- **Path alias** `@/*` → `src/*` (tsconfig + Vite; api e web). Use `@/` para
  traversal de pai; mantenha `./irmão` na mesma pasta (mais legível que
  `@/features/.../use-case`). Contrato cross-app vem de `@dealflow/shared`.
- **Barrel `index.ts`** por pasta (`ui`, `components`, `hooks`, `lib`, `types`,
  `tabs`) — importa-se a pasta, não o arquivo.
- **Verificar no browser** (app rodando) toda feature nova antes de commitar —
  teste verde não prova comportamento ponta-a-ponta. Refactor type-only/config
  dispensa (typecheck+lint+test+build cobrem).
- **Sem comentários** no código. Nomes explícitos falam por si.
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
