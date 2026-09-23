"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Benutzer</h1>
      <p className="text-gray-500 text-sm mb-8">
        {users.length} registrierte Benutzer
      </p>

      {loading ? (
        <p className="text-gray-500">Lade Benutzer...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">E-Mail</th>
                <th className="text-left p-4 font-medium">Rolle</th>
                <th className="text-left p-4 font-medium">Registriert</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="p-4 font-medium">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.role === "admin"
                          ? "bg-gold/20 text-gold-dark"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role === "admin" ? "Admin" : "Kunde"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {"created_at" in user
                      ? new Date(
                          (user as UserProfile & { created_at: string })
                            .created_at
                        ).toLocaleDateString("de-DE")
                      : "—"}
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
