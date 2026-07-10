import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground">
        {props.label}
        {props.hint && (
          <span className="font-normal text-muted-foreground/70">
            {props.hint}
          </span>
        )}
      </Label>
      <div className="flex items-center border border-input focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
        {props.prefix && (
          <span className="pl-2.5 font-mono text-xs text-muted-foreground">
            {props.prefix}
          </span>
        )}
        <Input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={cn(
            "border-0 focus-visible:ring-0",
            props.mono && "font-mono",
          )}
        />
      </div>
    </div>
  );
}
