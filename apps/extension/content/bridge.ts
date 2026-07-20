import type { PageMessage } from "@dealflow/shared"
import {
  asPageMessage,
  asRuntimeMessage,
  sendRuntimeMessage
} from "../messages"
import { isMercadoLivreProduct } from "./ml-url"

const post = (message: PageMessage) =>
  window.postMessage(message, window.location.origin)

window.addEventListener("message", (e) => {
  if (e.origin !== window.location.origin || e.source !== window) return
  const data = asPageMessage(e.data)
  if (data?.source !== "dealflow") return
  if (data.type === "ping") {
    post({ source: "dealflow-ext", type: "pong" })
  } else if (data.type === "mint" && isMercadoLivreProduct(data.sourceUrl)) {
    void sendRuntimeMessage({ type: "mint", sourceUrl: data.sourceUrl })
  }
})

chrome.runtime.onMessage.addListener((msg: unknown) => {
  const message = asRuntimeMessage(msg)
  if (message?.type === "mint-error") {
    post({ source: "dealflow-ext", type: "mint-error", error: message.error })
  }
})

post({ source: "dealflow-ext", type: "pong" })
