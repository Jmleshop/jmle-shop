import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const padCls = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6 md:p-8",
} as const;

export function Card({
  hoverLift,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "card-boutique bg-white",
        padCls[padding],
        hoverLift &&
          "hover:-translate-y-1 hover:shadow-gold hover:border-amber-200/80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 mb-4",
        className
      )}
    >
      <div>
        <h3 className="font-display text-xl text-luxury-ink">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1 font-body">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
