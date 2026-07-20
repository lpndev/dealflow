import { Button } from "@dealflow/ui/button"
import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { sendRuntimeMessage } from "../messages"
import { capture, productId } from "./ml-page"

type State =
  | { kind: "idle" }
  | { kind: "busy"; label: string }
  | { kind: "done" }
  | { kind: "error"; message: string }

function buttonLabel(state: State): string {
  switch (state.kind) {
    case "busy":
      return state.label
    case "done":
      return "✓ Capturada"
    case "error":
      return "✗ " + state.message
    default:
      return "Capturar oferta"
  }
}

function CaptureButton({ auto }: Readonly<{ auto: boolean }>) {
  const [state, setState] = useState<State>({ kind: "idle" })

  const run = useCallback(async () => {
    try {
      await capture((label) => setState({ kind: "busy", label }))
      setState({ kind: "done" })
    } catch (e) {
      const message = (e as Error).message || String(e)
      setState({ kind: "error", message })
      if (auto) void sendRuntimeMessage({ type: "mint-failed", error: message })
    }
    setTimeout(() => setState({ kind: "idle" }), 3500)
  }, [auto])

  useEffect(() => {
    if (auto) void run()
  }, [auto, run])

  const label = buttonLabel(state)

  return (
    <Button
      size={null}
      variant={state.kind === "error" ? "destructive" : "default"}
      disabled={state.kind === "busy"}
      onClick={() => void run()}
      className="gap-2 px-6 py-4 text-xl font-semibold shadow-lg"
    >
      {label}
    </Button>
  )
}

function mount() {
  const host = document.createElement("div")
  host.id = "dealflow-capture"
  Object.assign(host.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483647"
  })
  const shadow = host.attachShadow({ mode: "open" })
  const root = document.createElement("div")
  if (matchMedia("(prefers-color-scheme: dark)").matches)
    root.className = "dark"
  shadow.append(root)
  document.body.append(host)

  fetch(chrome.runtime.getURL("action/index.css"))
    .then((r) => r.text())
    .then((css) => {
      const style = document.createElement("style")
      style.textContent = css
      shadow.prepend(style)
    })
    .catch(() => {})

  createRoot(root).render(
    <CaptureButton auto={location.hash.includes("dealflow-auto")} />
  )
}

let mountedFor: string | null = null
function sync() {
  const id = productId()
  const existing = document.getElementById("dealflow-capture")
  if (!id) {
    existing?.remove()
    mountedFor = null
    return
  }
  if (id === mountedFor && existing) return
  existing?.remove()
  mountedFor = id
  mount()
}

sync()
setInterval(sync, 1000)
