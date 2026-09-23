import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type FieldSize = "sm" | "md" | "lg";

const sizeCls: Record<FieldSize, string> = {
  sm: "min-h-10 text-xs px-3 py-2 rounded-lg",
  md: "min-h-12 text-sm px-4 py-3 rounded-xl",
  lg: "min-h-14 text-base px-4 py-3.5 rounded-xl",
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Icon am Start (in RTL = rechts) */
  startIcon?: ReactNode;
  /** Icon am Ende (in RTL = links) */
  endIcon?: ReactNode;
  fieldSize?: FieldSize;
}

export function Input({
  label,
  hint,
  error,
  startIcon,
  endIcon,
  fieldSize = "md",
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-ui text-luxury-charcoal mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gold/80">
            {startIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full bg-white border border-amber-200/50 text-luxury-ink placeholder:text-gray-400 transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-50",
            sizeCls[fieldSize],
            startIcon && "ps-10",
            endIcon && "pe-10",
            error && "border-red-400 focus:border-red-500 focus:ring-red-200",
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {endIcon && (
          <span className="absolute inset-y-0 end-3 flex items-center text-gold/80">
            {endIcon}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-ui text-luxury-charcoal mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "input-field min-h-[96px] resize-y",
          error && "border-red-400 focus:border-red-500 focus:ring-red-200",
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
