"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Info, Loader2, RotateCcw } from "lucide-react";
import { useAdminI18n } from "@/components/admin/AdminI18n";

/** Einheitlicher Seitenkopf für alle Admin-Seiten. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminLoading({ label }: { label?: string }) {
  const { t } = useAdminI18n();
  return (
    <div role="status" className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
      <Loader2 size={16} className="animate-spin" aria-hidden />
      {label ?? t("loading")}
    </div>
  );
}

export function AdminError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useAdminI18n();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle size={18} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1">{message || t("loadFailed")}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300 bg-white px-3 font-medium hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
        >
          <RotateCcw size={14} aria-hidden />
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

export function AdminEmpty({ children }: { children?: ReactNode }) {
  const { t } = useAdminI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
      <Inbox size={22} aria-hidden className="text-gray-300" />
      {children ?? t("noEntries")}
    </div>
  );
}

export function AdminNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
      <Info size={18} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
