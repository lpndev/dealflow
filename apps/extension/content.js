const PRODUCT_RE = /\/(?:p|up)\/(MLBU?-?\d+)/i;

function productId() {
  const m = location.pathname.match(PRODUCT_RE);
  return m ? m[1].replace("-", "").toUpperCase() : null;
}

function parseBrl(text) {
  if (!text) return undefined;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function scrape() {
  let name, image, current;
  for (const s of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const j = JSON.parse(s.textContent);
      const node = Array.isArray(j) ? j.find((x) => x.offers) : j;
      if (node && node.offers) {
        name = node.name;
        image = Array.isArray(node.image) ? node.image[0] : node.image;
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        current = offer && Number(offer.price);
        break;
      }
    } catch {
      /* ignore */
    }
  }
  name = name || document.querySelector("h1.ui-pdp-title")?.textContent?.trim();
  const origEl = document.querySelector(
    ".ui-pdp-price__original-value .andes-money-amount__fraction, s .andes-money-amount__fraction",
  );
  const origCents = document.querySelector(
    ".ui-pdp-price__original-value .andes-money-amount__cents, s .andes-money-amount__cents",
  );
  const original = origEl
    ? parseBrl(
        origEl.textContent + (origCents ? "," + origCents.textContent : ""),
      )
    : undefined;
  return { name, image, current, original };
}

async function affiliateLink(url) {
  const tagsRes = await fetch("/affiliate-program/api/v2/stripe/user/tags", {
    credentials: "include",
  });
  if (!tagsRes.ok) throw new Error("não autenticado como afiliado");
  const tags = (await tagsRes.json()).tags || [];
  const tag = (tags.find((t) => t.in_use) || tags[0])?.tag;
  if (!tag) throw new Error("sem etiqueta de afiliado nessa conta");
  const res = await fetch("/affiliate-program/api/v2/stripe/user/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, tag }),
  });
  if (!res.ok) throw new Error("falha ao gerar o link (" + res.status + ")");
  const link = (await res.json()).short_url;
  if (!link) throw new Error("resposta sem short_url");
  return { link, tag };
}

async function capture(setStatus) {
  const url = location.href.split("?")[0].split("#")[0];
  const id = productId();
  setStatus("Gerando link…");
  const { link: affiliateUrl, tag: affiliateTag } = await affiliateLink(url);
  setStatus("Lendo a oferta…");
  const { name, image, current, original } = scrape();
  const draft = {
    sourceUrl: url,
    affiliateUrl,
    product: { externalId: id, title: name, imageUrl: image },
    price: { original, current },
  };
  setStatus("Enviando…");
  const reply = await chrome.runtime.sendMessage({
    type: "capture",
    draft,
    affiliateTag,
  });
  if (!reply?.ok) throw new Error(reply?.error || "Dealflow não respondeu");
  return draft;
}

function mountButton(runAuto) {
  const btn = document.createElement("button");
  btn.id = "dealflow-capture";
  btn.textContent = "Capturar oferta";
  Object.assign(btn.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483647",
    padding: "12px 18px",
    background: "#f5b841",
    color: "#0e1320",
    border: "none",
    borderRadius: "10px",
    font: "600 14px system-ui, sans-serif",
    boxShadow: "0 6px 20px rgba(0,0,0,.35)",
    cursor: "pointer",
  });
  const setStatus = (t, ok) => {
    btn.textContent = t;
    btn.style.background =
      ok === false ? "#f2555c" : ok ? "#35d08a" : "#f5b841";
  };
  const run = async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      await capture((t) => setStatus(t));
      setStatus("✓ Capturada", true);
    } catch (e) {
      setStatus("✗ " + (e.message || e), false);
    } finally {
      setTimeout(() => {
        setStatus("Capturar oferta");
        btn.disabled = false;
      }, 3500);
    }
  };
  btn.addEventListener("click", run);
  document.body.appendChild(btn);
  if (runAuto) {
    if (location.hash.includes("dealflow-auto")) run();
    else
      chrome.storage.local.get({ auto: false }, ({ auto }) => {
        if (auto) run();
      });
  }
}

let mountedFor = null;
function sync() {
  const id = productId();
  const existing = document.getElementById("dealflow-capture");
  if (!id) {
    existing?.remove();
    mountedFor = null;
    return;
  }
  if (id === mountedFor && existing) return;
  existing?.remove();
  const changedProduct = id !== mountedFor;
  mountedFor = id;
  mountButton(changedProduct);
}

sync();
setInterval(sync, 1000);
