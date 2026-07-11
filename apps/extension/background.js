const DEFAULTS = {
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
      const tabs = await chrome.tabs.query({ url: webUrl + "/*" });
      if (tabs[0]?.id != null)
        chrome.tabs.update(tabs[0].id, { active: true, url: webUrl + "/new" });
      else chrome.tabs.create({ url: webUrl + "/new" });
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: String(e.message || e) });
    }
  })();
  return true;
});
