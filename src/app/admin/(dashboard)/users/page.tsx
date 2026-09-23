"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/types";
import { AdminTable, AdminTd, AdminTh, AdminThead } from "@/components/ui";

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
        <div className="max-h-[70vh] overflow-hidden rounded-2xl">
          <AdminTable minWidth="640px">
            <AdminThead>
              <tr>
                <AdminTh>Name</AdminTh>
                <AdminTh>E-Mail</AdminTh>
                <AdminTh>Rolle</AdminTh>
                <AdminTh>Registriert</AdminTh>
              </tr>
            </AdminThead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <AdminTd className="font-medium whitespace-nowrap">
                    {user.first_name} {user.last_name}
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">{user.email}</AdminTd>
                  <AdminTd>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.role === "admin"
                          ? "bg-gold/20 text-gold-dark"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role === "admin" ? "Admin" : "Kunde"}
                    </span>
                  </AdminTd>
                  <AdminTd className="text-gray-500 whitespace-nowrap">
                    {"created_at" in user
                      ? new Date(
                          (user as UserProfile & { created_at: string })
                            .created_at
                        ).toLocaleDateString("de-DE")
                      : "—"}
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>
      )}
    </div>
  );
}
