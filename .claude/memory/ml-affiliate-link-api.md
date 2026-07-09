---
name: ml-affiliate-link-api
description: Reverse-engineered ML "Compartilhar" affiliate link generation endpoints — how the extension mints the operator's own meli.la
type: reference
---

Mercado Livre affiliate "Compartilhar" button, reverse-engineered in the operator's logged-in browser. Two same-origin calls on `www.mercadolivre.com.br`, session cookie only — **no CSRF header, no OAuth token**:

- `GET /affiliate-program/api/v2/stripe/user/tags` → `{ tags: [{ tag, in_use, generated_date }] }`. Pick the `in_use` tag (format `ct` + timestamp, e.g. `ct<timestamp>`).
- `POST /affiliate-program/api/v2/stripe/user/links`, header `content-type: application/json`, body `{ url: "<product /p/MLBxxxx url>", tag: "<tag>" }` → `{ id, short_url: "https://meli.la/xxx", long_url: "/social/<tag>?...", origin_url, type_url: "SOCIAL_PROFILE_ENCRYPTED", ... }`. `short_url` is our meli.la.

Dedupes by `(url, tag)` — same pair always returns the same short link. Verified a plain `fetch(url, { method:'POST', credentials:'include', body })` replays it (200, same meli.la). This is what `ExtensionSource` uses to generate the operator's OWN affiliate link from any ML product page. Bypasses the dev center `USER_BLOCKER` restriction (no dev account needed). Also documented in `CLAUDE.md` (Nota geração do link de afiliado).
