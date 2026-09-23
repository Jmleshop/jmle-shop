"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";

function gateErrorMessage(code: string | null) {
  if (code === "no_profile") {
    return "Anmeldung erforderlich — Profil fehlt. Bitte Support kontaktieren.";
  }
  if (code === "not_staff" || code === "unauthorized") {
    return "Kein Zugriff auf den Admin-Bereich mit diesem Konto.";
  }
  if (code === "forbidden") {
    return "Zugriff verweigert.";
  }
  return null;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fromGate = gateErrorMessage(searchParams.get("error"));
  const redirectTo = searchParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    // Admin-Redirect nur, wenn Ziel ein Admin-Pfad ist (Middleware prüft Rolle erneut)
    if (redirectTo?.startsWith("/admin") && !redirectTo.startsWith("/admin/login")) {
      router.push(redirectTo);
    } else {
      router.push("/profile");
    }
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-light text-center mb-2 tracking-wide">
        تسجيل الدخول
      </h1>
      <p className="text-gray-500 text-center text-sm mb-8">
        مرحباً بعودتك إلى jmle
      </p>

      {(fromGate || error) && (
        <p className="text-red-500 text-sm text-center mb-4">{error || fromGate}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm mb-1.5 text-gray-600">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input-field"
            dir="ltr"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm mb-1.5 text-gray-600">
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
            className="input-field"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ليس لديك حساب؟{" "}
        <Link href="/auth/register" className="text-gold hover:underline">
          إنشاء حساب
        </Link>
      </p>
      <p className="text-center text-xs text-gray-400 mt-3">
        Mitarbeiter?{" "}
        <Link href="/admin/login" className="text-gold hover:underline">
          Admin-Login
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-gray-400">جاري التحميل...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
