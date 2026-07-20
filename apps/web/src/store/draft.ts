import { create } from "zustand"
import { type Form } from "@/types"

type FormUpdate = Form | null | ((current: Form | null) => Form | null)

type DraftStore = {
  input: string
  form: Form | null
  mintedFor: string | null
  setInput: (input: string) => void
  setForm: (form: FormUpdate) => void
  setMintedFor: (externalId: string | null) => void
}

export const useDraftStore = create<DraftStore>((set) => ({
  input: "",
  form: null,
  mintedFor: null,
  setInput: (input) => set({ input }),
  setForm: (form) =>
    set((s) => ({ form: typeof form === "function" ? form(s.form) : form })),
  setMintedFor: (mintedFor) => set({ mintedFor })
}))
