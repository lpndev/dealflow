import { isMercadoLivreProduct } from "./content/ml-url";

const DEFAULTS = {
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
  apiKey: "",
};

const autoTabs = new Set<number>();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "mint" && isMercadoLivreProduct(msg.sourceUrl)) {
    chrome.tabs.create(
      { url: msg.sourceUrl + "#dealflow-auto", active: false },
      (tab) => {
        const id = tab?.id;
        if (id == null) return;
        autoTabs.add(id);
        setTimeout(() => {
          if (autoTabs.delete(id)) chrome.tabs.remove(id).catch(() => {});
        }, 30000);
      },
    );
    return;
  }

  if (msg?.type !== "capture") return;
  (async () => {
    const { apiUrl, webUrl, apiKey } = {
      ...DEFAULTS,
      ...(await chrome.storage.local.get(["apiUrl", "webUrl", "apiKey"])),
    };
    if (!apiKey) {
      console.warn("[Dealflow] set your API key in the extension popup");
      sendResponse({ ok: false, error: "missing api key" });
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
      });
      if (!res.ok) throw new Error("Dealflow respondeu " + res.status);
      const senderId = sender.tab?.id;
      const fromAuto = senderId != null && autoTabs.delete(senderId);
      sendResponse({ ok: true });
      if (fromAuto) {
        chrome.tabs.remove(senderId).catch(() => {});
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
