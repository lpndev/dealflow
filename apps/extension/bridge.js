window.addEventListener("message", (e) => {
  const d = e.data;
  if (e.source !== window || !d || d.source !== "dealflow") return;
  if (d.type === "ping")
    window.postMessage({ source: "dealflow-ext", type: "pong" }, "*");
  else if (d.type === "mint" && d.sourceUrl)
    chrome.runtime.sendMessage({ type: "mint", sourceUrl: d.sourceUrl });
});

window.postMessage({ source: "dealflow-ext", type: "pong" }, "*");
