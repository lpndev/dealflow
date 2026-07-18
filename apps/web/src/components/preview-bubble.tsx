import { ChecksIcon } from "@phosphor-icons/react";

export function PreviewBubble(props: {
  imageUrl?: string;
  text?: string;
  ready?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono tracking-wider uppercase">Preview</span>
        {props.ready && (
          <span className="bg-emerald-500/15 px-2 py-1 text-emerald-500">
            pronta para envio
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 rounded-lg bg-emerald-800 p-1.5 shadow-lg">
        {props.imageUrl && (
          <img
            src={props.imageUrl}
            alt=""
            className="w-full rounded-md bg-white object-contain"
          />
        )}
        {props.text && (
          <div className="flex flex-col gap-1 px-1.5 pb-1">
            <pre className="font-sans text-sm break-words whitespace-pre-wrap text-white">
              {props.text}
            </pre>
            <div className="flex items-center justify-end gap-1 text-[10px] text-white/60">
              agora
              <ChecksIcon className="size-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
