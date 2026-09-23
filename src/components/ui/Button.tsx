import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const variantCls: Record<Variant, string> = {
  primary:
    "bg-gold text-white shadow-gold-sm hover:bg-jmle-yellow hover:text-luxury-black hover:shadow-gold",
  outline:
    "border border-amber-200/80 bg-white/70 text-gold hover:bg-gold hover:text-white hover:border-gold",
  ghost: "bg-transparent text-luxury-charcoal hover:bg-jmle-warm hover:text-gold-dark",
  soft: "bg-jmle-warm text-luxury-black border border-amber-200/40 hover:border-gold/40",
};

const sizeCls: Record<Size, string> = {
  sm: "min-h-10 px-4 text-xs gap-1.5 rounded-lg",
  md: "min-h-12 px-6 text-sm gap-2 rounded-xl",
  lg: "min-h-14 px-8 text-base gap-2.5 rounded-xl",
  icon: "min-h-11 min-w-11 p-0 rounded-xl justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Icon vor dem Label (in RTL optisch rechts) */
  leadingIcon?: ReactNode;
  /** Icon nach dem Label (in RTL optisch links) */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-ui font-medium tracking-wide transition-all duration-300 ease-boutique active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-jmle-cream",
        variantCls[variant],
        sizeCls[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
