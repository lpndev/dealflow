import { type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Panel(props: {
  title: string;
  hint?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-4">
          {props.eyebrow && (
            <span className="font-mono text-xs text-primary">
              {props.eyebrow}
            </span>
          )}
          {props.title}
          {props.hint && (
            <span className="ml-auto hidden text-xs font-normal text-muted-foreground sm:block">
              {props.hint}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {props.children}
      </CardContent>
    </Card>
  );
}

export function Empty(props: { children: ReactNode }) {
  return (
    <p className="border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
      {props.children}
    </p>
  );
}

export function ErrorNote(props: { children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  );
}
