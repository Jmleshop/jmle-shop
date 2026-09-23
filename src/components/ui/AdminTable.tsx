import { cn } from "@/lib/cn";
import type { ReactNode, TableHTMLAttributes } from "react";

/**
 * Admin-Tabellen: horizontal scrollbar, sticky Header, Touch-freundlich.
 */
export function AdminTable({
  children,
  className,
  minWidth = "720px",
  ...props
}: TableHTMLAttributes<HTMLTableElement> & {
  minWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <table
          className={cn("w-full text-sm", className)}
          style={{ minWidth }}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function AdminThead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      {children}
    </thead>
  );
}

export function AdminTh({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const alignCls =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";
  return (
    <th
      className={cn(
        "p-3 sm:p-4 font-medium text-gray-600 whitespace-nowrap",
        alignCls,
        className
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const alignCls =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";
  return (
    <td className={cn("p-3 sm:p-4 align-middle", alignCls, className)}>
      {children}
    </td>
  );
}
