import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-background-elevated text-foreground-secondary border border-border",
        green: "bg-accent-green/10 text-accent-green border border-accent-green/20",
        purple: "bg-accent-purple/10 text-accent-purple border border-accent-purple/20",
        white: "bg-primary/10 text-foreground border border-border-subtle",
        secondary: "bg-secondary text-secondary-foreground border border-border",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20",
        outline: "text-foreground border border-border",
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
