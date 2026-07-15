import { Alert, AlertDescription } from "@dealflow/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@dealflow/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dealflow/ui/tooltip";
import { QuestionIcon } from "@phosphor-icons/react";
import { type ReactNode } from "react";

export function Panel(props: {
  title: string;
  hint?: ReactNode;
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
            <Tooltip>
              <TooltipTrigger
                aria-label="Ajuda"
                className="ml-auto self-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <QuestionIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-pretty">
                {props.hint}
              </TooltipContent>
            </Tooltip>
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
