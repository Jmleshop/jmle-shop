"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function urlErrorMessage(code: string | null) {
  if (code === "no_profile") {
    return "Anmeldung geklappt, aber es gibt kein Profil in der Tabelle profiles. Bitte supabase/fix-and-consolidate.sql im SQL Editor ausführen.";
  }
  if (code === "not_staff" || code === "unauthorized") {
    return "Anmeldung geklappt, aber die Rolle in profiles ist kein admin/employee (oft noch 'customer' oder leer).";
  }
  return null;
}

function safeAdminPath(raw: string | null, role: string) {
  const path = (raw ?? "/admin/dashboard").trim().replace(/[./]+$/, "");
  if (
    !path.startsWith("/admin") ||
    path.startsWith("/admin/login") ||
    path.includes("(") ||
    path.includes(")")
  ) {
    return "/admin/dashboard";
  }
  if (path === "/admin") return "/admin/dashboard";
  if (path.startsWith("/admin/activity") && role !== "admin") {
    return "/admin/dashboard";
  }
  return path;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const fromUrl = urlErrorMessage(searchParams.get("error"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "Anmeldung fehlgeschlagen.");
        setLoading(false);
        return;
      }
      window.location.assign(safeAdminPath(searchParams.get("redirect"), payload.role || "admin"));
    } catch {
      setError("Der Server ist gerade nicht erreichbar. Bitte die Seite neu laden.");
      setLoading(false);
    }
  };

  const visibleError = error || fromUrl;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 px-4"
      dir="ltr"
      lang="de"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-center mb-1">
          jmle Mitarbeiter
        </h1>
        <p className="text-gray-500 text-center text-sm mb-8">
          Melden Sie sich mit E-Mail und Passwort an
        </p>

        {visibleError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
            {visibleError}
          </div>
        )}

        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
          Lokal gilt nur das Demo-Konto
          <br />
          <span className="font-semibold">admin@jmle.test</span>
          <br />
          Passwort <span className="font-semibold">password123</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5 text-gray-600">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5 text-gray-600">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              autoComplete="current-password"
            />
          </div>

          <a href="/api/auth/admin-login" className="btn-primary w-full text-center">
            Als Admin öffnen
          </a>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Anmelden..." : "Anmelden"}
          </button>
          <button
            type="button"
            disabled={loading}
            className="w-full min-h-11 rounded-xl border border-amber-300 text-sm"
            onClick={() => {
              setEmail("admin@jmle.test");
              setPassword("password123");
            }}
          >
            Demo-Zugangsdaten einsetzen
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/" className="text-gold hover:underline">
            ← Zurück zum Shop
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100" />}>
      <LoginForm />
    </Suspense>
  );
}
