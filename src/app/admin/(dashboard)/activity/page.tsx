"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function entityName(entry: AuditLogEntry) {
  const data = asRecord(entry.new_data) ?? asRecord(entry.old_data);
  if (!data) return entry.record_id ?? "—";
  const de = data.name_de;
  const ar = data.name_ar;
  if (typeof de === "string" && de.trim()) return de.trim();
  if (typeof ar === "string" && ar.trim()) return ar.trim();
  return entry.record_id ?? "—";
}

function tableLabel(table: string) {
  if (table === "products") return "Produkt";
  if (table === "categories") return "Kategorie";
  return table;
}

function describeAction(entry: AuditLogEntry) {
  const name = entityName(entry);
  const kind = tableLabel(entry.table_name);
  const oldData = asRecord(entry.old_data);
  const newData = asRecord(entry.new_data);

  if (entry.action === "INSERT") {
    return `${kind} '${name}' hinzugefügt`;
  }
  if (entry.action === "DELETE") {
    return `${kind} '${name}' gelöscht`;
  }
  if (oldData && newData) {
    if (!oldData.deleted_at && newData.deleted_at) {
      return `${kind} '${name}' gelöscht`;
    }
    if (oldData.deleted_at && !newData.deleted_at) {
      return `${kind} '${name}' wiederhergestellt`;
    }
  }
  return `${kind} '${name}' bearbeitet`;
}

function actorEmail(entry: AuditLogEntry) {
  return (
    entry.user_email ||
    entry.actor?.email ||
    "—"
  );
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function AdminActivityPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/activity")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Laden fehlgeschlagen");
          return;
        }
        setEntries(data.entries ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Lade Aktivitätsprotokoll...</p>;
  }

  if (error) {
    return (
      <p className="text-red-600 bg-red-50 rounded-2xl p-4 text-sm">{error}</p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Aktivität</h1>
      <p className="text-gray-500 text-sm mb-8">
        Änderungen an Produkten und Kategorien mit Mitarbeiter-E-Mail
      </p>

      {entries.length === 0 ? (
        <p className="text-gray-500 bg-white rounded-2xl p-8 text-center border border-gray-100">
          Noch keine Einträge.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th className="text-left p-3 sm:p-4 font-medium whitespace-nowrap">Datum & Uhrzeit</th>
                  <th className="text-left p-3 sm:p-4 font-medium whitespace-nowrap">Mitarbeiter</th>
                  <th className="text-left p-3 sm:p-4 font-medium whitespace-nowrap">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="p-3 sm:p-4 whitespace-nowrap text-gray-600">
                      {formatWhen(entry.created_at)}
                    </td>
                    <td className="p-3 sm:p-4">{actorEmail(entry)}</td>
                    <td className="p-3 sm:p-4 font-medium">{describeAction(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
