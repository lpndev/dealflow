import { isMercadoLivreProduct } from "./content/ml-url"
import { asRuntimeMessage, type CaptureReply } from "./messages"

const DEFAULTS = {
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
  apiKey: ""
}

const autoTabs = new Map<number, ReturnType<typeof setTimeout>>()

function closeAutoTab(id: number) {
  const timer = autoTabs.get(id)
  if (timer) clearTimeout(timer)
  autoTabs.delete(id)
  chrome.tabs.remove(id).catch(() => {})
}

async function notifyWeb(error: string) {
  const { webUrl } = {
    ...DEFAULTS,
    ...(await chrome.storage.local.get(["webUrl"]))
  }
  const tabs = await chrome.tabs.query({ url: webUrl + "/*" })
  for (const t of tabs)
    if (t.id != null)
      chrome.tabs
        .sendMessage(t.id, { type: "mint-error", error })
        .catch(() => {})
}

function captureErrorMessage(status: number): string {
  if (status === 401 || status === 403)
    return "A API key da extensão está inválida ou expirada. Gere uma nova em Config → API keys e cole no popup da extensão."
  return "O Dealflow recusou a captura (" + status + ")."
}

chrome.runtime.onMessage.addListener(
  (msg: unknown, sender, sendResponse: (reply: CaptureReply) => void) => {
    const message = asRuntimeMessage(msg)
    if (message?.type === "mint" && isMercadoLivreProduct(message.sourceUrl)) {
      chrome.tabs.create(
        { url: message.sourceUrl + "#dealflow-auto", active: false },
        (tab) => {
          const id = tab?.id
          if (id == null) return
          autoTabs.set(
            id,
            setTimeout(() => {
              if (autoTabs.has(id)) {
                void notifyWeb(
                  "Não consegui gerar o link a tempo. O Mercado Livre pode ter travado — tente de novo."
                )
                closeAutoTab(id)
              }
            }, 30000)
          )
        }
      )
      return
    }

    if (message?.type === "mint-failed") {
      void notifyWeb(message.error || "Falha ao gerar o link de afiliado.")
      const id = sender.tab?.id
      if (id != null && autoTabs.has(id)) closeAutoTab(id)
      return
    }

    if (message?.type !== "capture") return
    void (async () => {
      const { apiUrl, webUrl, apiKey } = {
        ...DEFAULTS,
        ...(await chrome.storage.local.get(["apiUrl", "webUrl", "apiKey"]))
      }
      if (!apiKey) {
        sendResponse({
          ok: false,
          error:
            "Configure a API key da extensão no popup (gere em Config → API keys)."
        })
        return
      }
      try {
        const res = await fetch(apiUrl + "/deals/capture", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            draft: message.draft,
            affiliateTag: message.affiliateTag
          })
        }).catch(() => null)
        if (!res)
          throw new Error(
            "Não consegui falar com o Dealflow. A API está rodando?"
          )
        if (!res.ok) throw new Error(captureErrorMessage(res.status))
        const senderId = sender.tab?.id
        const fromAuto = senderId != null && autoTabs.has(senderId)
        sendResponse({ ok: true })
        if (fromAuto) {
          closeAutoTab(senderId)
        } else {
          const tabs = await chrome.tabs.query({ url: webUrl + "/*" })
          if (tabs[0]?.id != null)
            void chrome.tabs.update(tabs[0].id, {
              active: true,
              url: webUrl + "/new"
            })
          else void chrome.tabs.create({ url: webUrl + "/new" })
        }
      } catch (e) {
        sendResponse({ ok: false, error: String((e as Error).message || e) })
      }
    })()
    return true
  }
)
