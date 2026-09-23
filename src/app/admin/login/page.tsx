"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
  const fromUrl = urlErrorMessage(searchParams.get("error"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      console.error("[admin-login] Auth-Fehler:", authError?.message, authError);
      setError("E-Mail oder Passwort ist falsch.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, email, full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[admin-login] profiles-Abfrage:", profileError.message, profileError);
      setError(
        `Profil konnte nicht gelesen werden (${profileError.message}). Meist fehlt eine SELECT-Policy auf profiles.`
      );
      setLoading(false);
      return;
    }

    if (!profile) {
      console.error("[admin-login] Kein profiles-Eintrag für User", data.user.id);
      setError(
        "Login erfolgreich, aber kein Eintrag in profiles für diesen Benutzer. Bitte supabase/fix-and-consolidate.sql ausführen."
      );
      setLoading(false);
      return;
    }

    const role = String(profile.role ?? "").toLowerCase().trim();
    if (role !== "admin" && role !== "employee") {
      console.error("[admin-login] Ungültige Rolle:", profile.role, profile);
      setError(
        `Login erfolgreich, Profil gefunden, aber role ist „${profile.role || "(leer)"}“ statt admin oder employee.`
      );
      setLoading(false);
      return;
    }

    window.location.assign(safeAdminPath(searchParams.get("redirect"), role));
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Anmelden..." : "Anmelden"}
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
