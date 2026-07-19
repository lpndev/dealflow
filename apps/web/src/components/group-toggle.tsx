import { Checkbox } from "@dealflow/ui/checkbox";

export function GroupToggle(
  props: Readonly<{
    name: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }>,
) {
  return (
    <li className="grow basis-full sm:basis-[calc(50%-0.25rem)]">
      <label
        className={`flex cursor-pointer items-center gap-2 border px-4 py-2 text-xs transition-colors ${
          props.checked
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border bg-card text-muted-foreground hover:border-ring"
        }`}
      >
        <Checkbox
          checked={props.checked}
          onCheckedChange={(checked) => props.onCheckedChange(checked === true)}
        />
        <span className="truncate">{props.name}</span>
      </label>
    </li>
  );
}
