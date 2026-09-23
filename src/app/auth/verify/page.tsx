"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function VerifyForm() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const supabase = createClient();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (verifyError) {
      setError("رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.");
      setLoading(false);
      return;
    }

    router.push("/profile");
    router.refresh();
  };

  const handleResend = async () => {
    setResent(false);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (!resendError) {
      setResent(true);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-light text-center mb-2 tracking-wide">
        تأكيد البريد الإلكتروني
      </h1>
      <p className="text-gray-500 text-center text-sm mb-8">
        أدخل رمز التحقق المرسل إلى{" "}
        <span className="text-luxury-black font-medium" dir="ltr">
          {email}
        </span>
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm mb-1.5 text-gray-600">
            رمز التحقق
          </label>
          <input
            id="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder="000000"
            maxLength={6}
            className="input-field text-center text-2xl tracking-[0.5em] font-mono"
            dir="ltr"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        {resent && (
          <p className="text-green-600 text-sm text-center">
            تم إرسال رمز جديد!
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? "جاري التحقق..." : "تأكيد"}
        </button>
      </form>

      <div className="text-center mt-6">
        <button
          onClick={handleResend}
          className="text-sm text-gold hover:underline"
        >
          إعادة إرسال الرمز
        </button>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/auth/login" className="text-gold hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-gray-400">جاري التحميل...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
