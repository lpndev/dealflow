import { isMercadoLivreProduct } from "./ml-url";

window.addEventListener("message", (e) => {
  const d = e.data;
  if (e.source !== window || !d || d.source !== "dealflow") return;
  if (d.type === "ping")
    window.postMessage({ source: "dealflow-ext", type: "pong" }, "*");
  else if (d.type === "mint" && isMercadoLivreProduct(d.sourceUrl))
    chrome.runtime.sendMessage({ type: "mint", sourceUrl: d.sourceUrl });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "mint-error")
    window.postMessage(
      { source: "dealflow-ext", type: "mint-error", error: msg.error },
      "*",
    );
});

window.postMessage({ source: "dealflow-ext", type: "pong" }, "*");
