import * as React from "react";
import { cn } from "@/lib/utils";

/** Mono uppercase eyebrow label */
export function Eyebrow({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("eyebrow", className)} {...props}>
      {children}
    </span>
  );
}

/** Large tabular monospace number for stats */
export function StatNumber({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="font-mono tabular-nums text-foreground leading-none" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {label ? <div className="eyebrow">{label}</div> : null}
    </div>
  );
}

/** Hairline divider line */
export function HairlineDivider({
  vertical = false,
  className,
}: {
  vertical?: boolean;
  className?: string;
}) {
  return (
    <div
      role="separator"
      className={cn(
        vertical ? "w-px h-full bg-white/[0.08]" : "h-px w-full bg-white/[0.08]",
        className,
      )}
    />
  );
}

/** Mono uppercase tag chip (rounded pill, hairline border) */
export function MonoTag({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("mono-tag", className)} {...props}>
      {children}
    </span>
  );
}

/** Mono keycap hint (e.g. for cmd-k) */
export function KeycapHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("keycap", className)}>{children}</span>;
}

/** Infinite horizontal marquee (logos / keywords). Duplicate children for seamless loop. */
export function Marquee({
  children,
  className,
  speed = "normal",
}: {
  children: React.ReactNode;
  className?: string;
  speed?: "slow" | "normal" | "fast";
}) {
  const duration = speed === "slow" ? "60s" : speed === "fast" ? "25s" : "40s";
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="flex w-max animate-marquee" style={{ animationDuration: duration }}>
        <div className="flex shrink-0 items-center gap-12 pr-12">{children}</div>
        <div className="flex shrink-0 items-center gap-12 pr-12" aria-hidden>{children}</div>
      </div>
    </div>
  );
}
