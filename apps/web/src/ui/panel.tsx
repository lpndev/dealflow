import { type ReactNode } from "react";

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
