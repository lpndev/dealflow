export function PreviewBubble(props: { text: string; ready?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-mono tracking-wider uppercase">Preview</span>
        {props.ready && (
          <span className="rounded-full bg-go/15 px-2 py-0.5 text-go">
            pronta para envio
          </span>
        )}
      </div>
      <div className="rounded-xl rounded-tl-sm bg-wa p-3 shadow-lg">
        <pre className="font-sans text-sm break-words whitespace-pre-wrap text-white">
          {props.text}
        </pre>
        <div className="mt-1 text-right text-[10px] text-white/60">
          agora ✓✓
        </div>
      </div>
    </div>
  );
}
