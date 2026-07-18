import { isMercadoLivreProduct } from "./content/ml-url";

const DEFAULTS = {
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
  apiKey: "",
};

const autoTabs = new Map<number, ReturnType<typeof setTimeout>>();

function closeAutoTab(id: number) {
  const timer = autoTabs.get(id);
  if (timer) clearTimeout(timer);
  autoTabs.delete(id);
  chrome.tabs.remove(id).catch(() => {});
}

async function notifyWeb(error: string) {
  const { webUrl } = {
    ...DEFAULTS,
    ...(await chrome.storage.local.get(["webUrl"])),
  };
  const tabs = await chrome.tabs.query({ url: webUrl + "/*" });
  for (const t of tabs)
    if (t.id != null)
      chrome.tabs
        .sendMessage(t.id, { type: "mint-error", error })
        .catch(() => {});
}

function captureErrorMessage(status: number): string {
  if (status === 401 || status === 403)
    return "A API key da extensão está inválida ou expirada. Gere uma nova em Config → API keys e cole no popup da extensão.";
  return "O Dealflow recusou a captura (" + status + ").";
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "mint" && isMercadoLivreProduct(msg.sourceUrl)) {
    chrome.tabs.create(
      { url: msg.sourceUrl + "#dealflow-auto", active: false },
      (tab) => {
        const id = tab?.id;
        if (id == null) return;
        autoTabs.set(
          id,
          setTimeout(() => {
            if (autoTabs.has(id)) {
              notifyWeb(
                "Não consegui gerar o link a tempo. O Mercado Livre pode ter travado — tente de novo.",
              );
              closeAutoTab(id);
            }
          }, 30000),
        );
      },
    );
    return;
  }

  if (msg?.type === "mint-failed") {
    notifyWeb(String(msg.error || "Falha ao gerar o link de afiliado."));
    const id = sender.tab?.id;
    if (id != null && autoTabs.has(id)) closeAutoTab(id);
    return;
  }

  if (msg?.type !== "capture") return;
  (async () => {
    const { apiUrl, webUrl, apiKey } = {
      ...DEFAULTS,
      ...(await chrome.storage.local.get(["apiUrl", "webUrl", "apiKey"])),
    };
    if (!apiKey) {
      sendResponse({
        ok: false,
        error:
          "Configure a API key da extensão no popup (gere em Config → API keys).",
      });
      return;
    }
    try {
      const res = await fetch(apiUrl + "/deals/capture", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          draft: msg.draft,
          affiliateTag: msg.affiliateTag,
        }),
      }).catch(() => null);
      if (!res)
        throw new Error(
          "Não consegui falar com o Dealflow. A API está rodando?",
        );
      if (!res.ok) throw new Error(captureErrorMessage(res.status));
      const senderId = sender.tab?.id;
      const fromAuto = senderId != null && autoTabs.has(senderId);
      sendResponse({ ok: true });
      if (fromAuto) {
        closeAutoTab(senderId);
      } else {
        const tabs = await chrome.tabs.query({ url: webUrl + "/*" });
        if (tabs[0]?.id != null)
          chrome.tabs.update(tabs[0].id, {
            active: true,
            url: webUrl + "/new",
          });
        else chrome.tabs.create({ url: webUrl + "/new" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String((e as Error).message || e) });
    }
  })();
  return true;
});
