"use client";

import { toast } from "react-hot-toast";

type SoftDeleteKind = "product" | "category";

/**
 * Soft-Delete mit Toast + Rückgängig.
 * Ändert nur deleted_at — keine Produktdaten.
 */
export async function softDeleteWithUndo(opts: {
  kind: SoftDeleteKind;
  id: string;
  name: string;
  onDone?: () => void;
}): Promise<boolean> {
  const { kind, id, name, onDone } = opts;
  const path =
    kind === "product"
      ? `/api/admin/products/${id}`
      : `/api/admin/categories/${id}`;

  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    toast.error(data.error || "Verschieben fehlgeschlagen");
    return false;
  }

  const label =
    kind === "product"
      ? `„${name}“ in den Papierkorb verschoben`
      : `Kategorie „${name}“ in den Papierkorb verschoben`;

  toast.custom(
    (t) => (
      <div className="flex items-center gap-3 text-sm bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 max-w-md">
        <span className="flex-1 text-gray-800">{label}</span>
        <button
          type="button"
          className="shrink-0 font-semibold text-emerald-700 underline underline-offset-2 min-h-10 px-2"
          onClick={() => {
            void (async () => {
              toast.dismiss(t.id);
              const undo = await fetch(path, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ archived: false }),
              });
              if (undo.ok) {
                toast.success("Wiederhergestellt");
                onDone?.();
              } else {
                toast.error("Wiederherstellen fehlgeschlagen");
              }
            })();
          }}
        >
          Rückgängig
        </button>
      </div>
    ),
    { duration: 6000, position: "bottom-center" }
  );

  onDone?.();
  return true;
}
