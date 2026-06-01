import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "outline";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  /** Use "panel" for inline dashboard tiles (bordered card), "plain" for inside an existing card */
  variant?: "panel" | "plain";
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  secondaryAction,
  className,
  variant = "panel",
}: EmptyStateProps) {
  const renderAction = (a: EmptyStateAction) => {
    const btn = (
      <Button
        variant={a.variant ?? "default"}
        onClick={a.onClick}
        className="rounded-full px-6"
      >
        {a.label}
      </Button>
    );
    return a.to ? <Link to={a.to}>{btn}</Link> : btn;
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center text-center px-6 py-12",
        variant === "panel" &&
          "rounded-2xl border border-dashed border-border bg-background",
        className,
      )}
    >
      <div
        className="flex items-center justify-center rounded-full bg-[#F7F7F7] text-foreground-muted mb-5"
        style={{ width: 80, height: 80 }}
        aria-hidden
      >
        <Icon size={36} strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {message && (
        <p className="text-sm text-foreground-muted mt-2 max-w-sm leading-relaxed">
          {message}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && renderAction(action)}
          {secondaryAction && renderAction(secondaryAction)}
        </div>
      )}
    </div>
  );
}
