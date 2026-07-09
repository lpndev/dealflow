import { type ButtonHTMLAttributes } from "react";

type Variant = "gold" | "outline" | "go";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-gold text-ink font-semibold hover:brightness-110",
  outline: "border border-line text-text font-medium hover:border-muted",
  go: "bg-go text-ink font-semibold hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-1.5",
  md: "px-5 py-2.5",
  lg: "px-5 py-3",
};

export function Button({
  variant = "gold",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      className={`rounded-lg text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

export function IconButton(props: {
  label: string;
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`grid h-7 w-7 place-items-center rounded border border-line text-sm transition hover:border-muted disabled:opacity-30 ${
        props.danger ? "text-fail hover:border-fail" : "text-muted"
      }`}
    >
      {props.children}
    </button>
  );
}
