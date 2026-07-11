const DEFAULTS = {
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
};

const autoTabs = new Set();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "mint" && msg.sourceUrl) {
    chrome.tabs.create(
      { url: msg.sourceUrl + "#dealflow-auto", active: false },
      (tab) => {
        if (tab?.id == null) return;
        autoTabs.add(tab.id);
        setTimeout(() => {
          if (autoTabs.delete(tab.id))
            chrome.tabs.remove(tab.id).catch(() => {});
        }, 30000);
      },
    );
    return;
  }

  if (msg?.type !== "capture") return;
  (async () => {
    const { apiUrl, webUrl } = {
      ...DEFAULTS,
      ...(await chrome.storage.local.get(["apiUrl", "webUrl"])),
    };
    try {
      const res = await fetch(apiUrl + "/deals/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: msg.draft }),
      });
      if (!res.ok) throw new Error("Dealflow respondeu " + res.status);
      const fromAuto = sender.tab?.id != null && autoTabs.delete(sender.tab.id);
      sendResponse({ ok: true });
      if (fromAuto) {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
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
      sendResponse({ ok: false, error: String(e.message || e) });
    }
  })();
  return true;
});
