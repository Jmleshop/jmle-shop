"use client";

import { Toaster } from "react-hot-toast";

/**
 * Globales Toast-System (react-hot-toast) — RTL-freundlich, Boutique-Stil.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      reverseOrder={false}
      gutter={10}
      toastOptions={{
        duration: 3200,
        className: "font-ui text-sm !rounded-2xl !shadow-gold !border !border-amber-200/60",
        style: {
          background: "#FFFBEB",
          color: "#7C2D12",
          direction: "rtl",
          maxWidth: "92vw",
          padding: "12px 16px",
        },
        success: {
          iconTheme: { primary: "#F97316", secondary: "#FFFBEB" },
        },
        error: {
          iconTheme: { primary: "#DC2626", secondary: "#FFFBEB" },
        },
      }}
      containerStyle={{ bottom: 80 }}
    />
  );
}

export { toast } from "react-hot-toast";
