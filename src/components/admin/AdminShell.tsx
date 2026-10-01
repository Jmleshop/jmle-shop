"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { AdminI18nProvider } from "@/components/admin/AdminI18n";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { StaffRole } from "@/types";
import { cn } from "@/lib/cn";

export default function AdminShell({
  role,
  displayName,
  children,
}: {
  role: StaffRole;
  displayName?: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AdminI18nProvider>
      <div
        className="fixed inset-0 z-[100] flex bg-gray-100 overflow-hidden"
        lang="de"
      >
        <div className="hidden md:flex shrink-0">
          <AdminSidebar role={role} displayName={displayName} />
        </div>

        {navOpen && (
          <div className="md:hidden fixed inset-0 z-[110]">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Menü schließen"
              onClick={() => setNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">
              <AdminSidebar
                role={role}
                displayName={displayName}
                onNavigate={() => setNavOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-200">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="p-2.5 min-h-11 min-w-11 rounded-xl border border-gray-200 bg-white"
              aria-label="Menü öffnen"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">jmle Intern</p>
              <p className="text-[11px] text-gray-500 truncate">
                {displayName || role}
              </p>
            </div>
            {navOpen && (
              <button
                type="button"
                className="ms-auto p-2"
                onClick={() => setNavOpen(false)}
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div
            className={cn(
              "p-4 sm:p-6 md:p-8 max-w-7xl",
              "[&_input]:min-h-11 [&_select]:min-h-11 [&_textarea]:min-h-[88px]",
              "[&_button]:min-h-10"
            )}
          >
            {children}
          </div>
        </main>

        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 5000,
            className: "text-sm !rounded-xl !shadow-lg !border !border-gray-200",
            style: {
              background: "#fff",
              color: "#111",
              maxWidth: "92vw",
              padding: "12px 16px",
            },
          }}
          containerStyle={{ zIndex: 200, bottom: 24 }}
        />
      </div>
    </AdminI18nProvider>
  );
}
