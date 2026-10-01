"use client";

import { useEffect } from "react";

/**
 * Root-Level Error Boundary (ersetzt das Root-Layout bei kritischen Fehlern).
 * Muss eigenes html/body mitbringen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? error.message, error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#FBF7F0",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            background: "#ffffff",
            border: "1px solid rgba(251, 146, 60, 0.25)",
            borderRadius: "1rem",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(249, 115, 22, 0.08)",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem", fontWeight: 600 }}>
            Etwas ist schiefgelaufen
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
            Bitte versuche es erneut oder kehre zur Startseite zurück.
          </p>
          {error.digest ? (
            <p
              style={{
                fontSize: "0.7rem",
                color: "#9ca3af",
                fontFamily: "ui-monospace, monospace",
                marginBottom: "1.25rem",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "48px",
                border: 0,
                borderRadius: "0.75rem",
                background: "#ea580c",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                padding: "0.75rem 1rem",
              }}
            >
              Erneut versuchen
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                minHeight: "48px",
                border: "1px solid rgba(251, 146, 60, 0.35)",
                borderRadius: "0.75rem",
                background: "#fff",
                color: "#1f2937",
                fontWeight: 600,
                cursor: "pointer",
                padding: "0.75rem 1rem",
              }}
            >
              Zur Startseite
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
