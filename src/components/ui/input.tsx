import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[4px] bg-white/[0.03] border border-white/10 px-3.5 text-sm text-foreground placeholder:text-foreground-subtle hover:border-white/20 focus-visible:outline-none focus-visible:border-white/40 focus-visible:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
