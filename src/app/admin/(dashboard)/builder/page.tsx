import { Suspense } from "react";
import LayoutBuilderClient from "@/components/admin/LayoutBuilderClient";

export const dynamic = "force-dynamic";

export default function AdminLayoutBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
          Shop-Editor…
        </div>
      }
    >
      <LayoutBuilderClient />
    </Suspense>
  );
}
