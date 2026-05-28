import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono uppercase tracking-[0.14em] text-[10px] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] text-foreground border border-white/10",
        green: "bg-white/[0.06] text-foreground border border-white/10",
        purple: "bg-white/[0.06] text-foreground border border-white/10",
        white: "bg-foreground text-background border border-foreground",
        secondary: "bg-white/[0.04] text-foreground-muted border border-white/8",
        destructive: "bg-destructive/15 text-destructive border border-destructive/30",
        outline: "text-foreground-muted border border-white/12",
        success: "text-success border border-success/30 bg-success/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
