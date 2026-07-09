# Dealflow

Sistema operacional de ofertas para grupos de WhatsApp, operado por uma pessoa.
Transforma o processo manual de preparar e enviar uma oferta (abrir marketplace,
copiar dados, montar mensagem, abrir WhatsApp, enviar N vezes) em
**colar → revisar → enviar**.

O operador continua no loop: a automação assiste, o humano decide.

```
Signal → Product → DealSnapshot → AffiliateLink → Publication → Delivery
```

## Stack

- **Monorepo:** Bun workspaces (`apps/*`)
- **Web:** React + Vite + Tailwind CSS — `apps/web`
- **API:** Hono + Bun (porta 3001) — `apps/api`
- **WhatsApp gateway:** Baileys (porta 3002) — `apps/wa-gateway`
- **Extensão:** Chrome MV3 (captura de oferta + link de afiliado) — `apps/extension`
- SQLite + Drizzle, TypeScript strict, ESLint, Prettier, `bun test`

## Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.3
- Uma conta comum do Mercado Livre (para o programa de afiliados) e um número
  de WhatsApp — nada de CNPJ, conta business ou API paga.

## Setup

```sh
git clone <repo> dealflow && cd dealflow
bun install
bun run dev        # sobe web (5173) + api (3001) + wa-gateway (3002)
```

Abra <http://localhost:5173>. Tudo roda 100% local; nenhum serviço pago é
necessário.

### Banco de dados

SQLite em `dealflow.db` na raiz da API (ignorado no git), criado e migrado
automaticamente no boot. Só rode isto após mudar o schema:

```sh
bun run --filter '@dealflow/api' db:generate
```

Override do caminho via `DATABASE_URL`.

### Conectar o WhatsApp

1. Abra a aba **Config** / painel de WhatsApp no app.
2. Escaneie o QR com o celular (WhatsApp → Aparelhos conectados).
3. A sessão fica em `apps/wa-gateway/wa-auth/` (ignorada no git — **nunca
   commite essa pasta**).

### Extensão de captura (opcional, recomendado)

Gera o **seu** link de afiliado e captura preço/título/imagem direto da página
do produto, na sua sessão logada.

1. `chrome://extensions` → ligue **Modo de desenvolvedor**.
2. **Carregar sem compactação** → selecione `apps/extension/`.
3. Abra um produto no Mercado Livre logado na conta de afiliado e clique em
   **Capturar oferta**. O app abre com o formulário preenchido.

Portas/URLs configuráveis no popup da extensão.

## Qualidade

```sh
bun run lint
bun run typecheck
bun test
bun run format
```

## Segurança e privacidade

Este repositório é público. **Não commite** segredos nem dados pessoais:
sessão do WhatsApp (`wa-auth/`), banco (`*.db`), tokens, links de afiliado
reais, emails, telefones ou JIDs. O `.gitignore` já cobre os arquivos de
sessão e banco. A API e o gateway ligam só em `127.0.0.1` (uma máquina, um
operador). Ao rodar a sua própria cópia, seus dados ficam na sua máquina.

## Licença

[PolyForm Perimeter 1.0.1](LICENSE.md) — self-hosting à vontade, inclusive para
uso comercial próprio. O que **não** é permitido é usar o software para oferecer
a terceiros um produto que **compete** com o Dealflow (revenda, cópia como
serviço concorrente). O nome e a logo "Dealflow" não são licenciados.
