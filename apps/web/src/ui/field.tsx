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
      <label className="flex items-baseline gap-2 text-xs font-medium tracking-wider text-muted uppercase">
        {props.label}
        {props.hint && (
          <span className="tracking-normal text-muted/70 normal-case">
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
