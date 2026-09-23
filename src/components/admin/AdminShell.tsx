"use client";

import { AdminI18nProvider } from "@/components/admin/AdminI18n";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { StaffRole } from "@/types";

export default function AdminShell({
  role,
  displayName,
  children,
}: {
  role: StaffRole;
  displayName?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminI18nProvider>
      <div
        className="fixed inset-0 z-[100] flex bg-gray-100 overflow-hidden"
        lang="de"
      >
        <AdminSidebar role={role} displayName={displayName} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </AdminI18nProvider>
  );
}
