import { type ReactNode } from "react";

export function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-2 text-xs font-medium uppercase tracking-wider text-muted">
        {props.label}
        {props.hint && (
          <span className="normal-case tracking-normal text-muted/70">
            {props.hint}
          </span>
        )}
      </label>
      <div className="flex items-center rounded-lg border border-line bg-inset focus-within:border-gold">
        {props.prefix && (
          <span className="pl-3 font-mono text-sm text-muted">
            {props.prefix}
          </span>
        )}
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`w-full bg-transparent px-3 py-2 text-sm text-text focus:outline-none ${
            props.mono ? "font-mono" : ""
          }`}
        />
      </div>
    </div>
  );
}

export function Panel(props: {
  title: string;
  hint?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 lg:p-6">
      <div className="mb-4 flex items-baseline gap-3">
        {props.eyebrow && (
          <span className="font-mono text-xs text-gold">{props.eyebrow}</span>
        )}
        <h2 className="text-lg font-semibold text-text">{props.title}</h2>
        {props.hint && (
          <span className="ml-auto hidden text-xs text-muted sm:block">
            {props.hint}
          </span>
        )}
      </div>
      {props.children}
    </section>
  );
}

export function Empty(props: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {props.children}
    </p>
  );
}

export function ErrorNote(props: { children: ReactNode }) {
  return (
    <p className="rise rounded-lg border border-fail/40 bg-fail/10 px-4 py-3 text-sm text-fail">
      {props.children}
    </p>
  );
}

export function PreviewBubble(props: { text: string; ready: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-mono uppercase tracking-wider">Preview</span>
        {props.ready && (
          <span className="rounded-full bg-go/15 px-2 py-0.5 text-go">
            pronta para envio
          </span>
        )}
      </div>
      <div className="rounded-xl rounded-tl-sm bg-wa p-3 shadow-lg">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-white">
          {props.text}
        </pre>
        <div className="mt-1 text-right text-[10px] text-white/60">
          agora ✓✓
        </div>
      </div>
    </div>
  );
}
