"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useShopLocale } from "@/components/ShopLocale";
import { Button } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { t } = useShopLocale();

  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-jmle-cream/40">
      <div className="w-full max-w-md rounded-2xl border border-orange-100/80 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-brand-orange">
          <AlertTriangle size={28} aria-hidden />
        </div>
        <h1 className="font-display text-2xl text-luxury-ink mb-2">
          {t("errorTitle")}
        </h1>
        <p className="font-ui text-sm text-gray-500 mb-6 leading-relaxed">
          {t("errorHint")}
        </p>
        {error.digest ? (
          <p className="mb-6 font-mono text-[11px] text-gray-400">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            onClick={() => reset()}
            className="min-h-12"
          >
            {t("tryAgain")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/")}
            className="min-h-12"
          >
            {t("backHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
