"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { DiscountCode } from "@/types";

const emptyForm = {
  code: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  usage_limit: "",
  expires_at: "",
};

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDiscounts = () => {
    fetch("/api/admin/discounts")
      .then((r) => r.json())
      .then((data) => setDiscounts(data.discounts ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        value: parseFloat(form.value),
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
        expires_at: form.expires_at || null,
        active: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erstellen fehlgeschlagen");
      setSaving(false);
      return;
    }

    setShowForm(false);
    setForm(emptyForm);
    setSaving(false);
    loadDiscounts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Rabatte</h1>
          <p className="text-gray-500 text-sm mt-1">
            Rabattcodes und Produktrabatte verwalten
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Neuer Rabattcode
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold mb-4">Neuer Rabattcode</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                className="input-field uppercase"
                placeholder="SOMMER20"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Typ</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as "percent" | "fixed",
                  })
                }
                className="input-field"
              >
                <option value="percent">Prozent (%)</option>
                <option value="fixed">Festbetrag (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Wert</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Nutzungslimit (optional)</label>
              <input
                type="number"
                min="1"
                value={form.usage_limit}
                onChange={(e) =>
                  setForm({ ...form, usage_limit: e.target.value })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Ablaufdatum (optional)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm({ ...form, expires_at: e.target.value })
                }
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? "Erstellen..." : "Erstellen"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline"
              >
                Abbrechen
              </button>
            </div>
          </form>
          {error && (
            <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
        <h2 className="font-semibold mb-3">Produktrabatte (Originalpreis)</h2>
        <p className="text-sm text-gray-500">
          Rabatte auf einzelne Produkte werden über den{" "}
          <strong>Originalpreis</strong> im Bereich Produkte gesetzt. Wenn der
          Originalpreis höher als der Verkaufspreis ist, wird automatisch ein
          Rabatt im Shop angezeigt.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Lade Rabattcodes...</p>
      ) : discounts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">
          Noch keine Rabattcodes erstellt.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Code</th>
                <th className="text-left p-4 font-medium">Typ</th>
                <th className="text-left p-4 font-medium">Wert</th>
                <th className="text-left p-4 font-medium">Genutzt</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-4 font-mono font-medium">{d.code}</td>
                  <td className="p-4">
                    {d.type === "percent" ? "Prozent" : "Festbetrag"}
                  </td>
                  <td className="p-4">
                    {d.type === "percent" ? `${d.value}%` : `${d.value} €`}
                  </td>
                  <td className="p-4">
                    {d.usage_count}
                    {d.usage_limit ? ` / ${d.usage_limit}` : ""}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        d.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {d.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
