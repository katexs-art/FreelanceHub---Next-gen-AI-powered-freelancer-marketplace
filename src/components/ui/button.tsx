import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-full",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        outline: "bg-transparent text-foreground border-[1.5px] border-foreground hover:bg-foreground hover:text-background",
        ghost: "bg-transparent text-foreground hover:bg-black/[0.05]",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-black/[0.04]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        green: "bg-primary text-primary-foreground hover:bg-primary-hover",
        link: "text-foreground underline-offset-4 hover:underline rounded-none font-normal",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
