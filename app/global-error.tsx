"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          background: "#fff7ed",
          color: "#1f2937",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <main
          style={{
            width: "min(90vw, 420px)",
            padding: 24,
            border: "1px solid #fed7aa",
            borderRadius: 8,
            background: "#ffffff",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
          }}
        >
          <p style={{ margin: "0 0 8px", color: "#f26522", fontWeight: 700 }}>
            TableQR
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: 24, lineHeight: 1.2 }}>
            Une erreur est survenue
          </h1>
          <p style={{ margin: "0 0 20px", color: "#4b5563", lineHeight: 1.5 }}>
            La page n&apos;a pas pu se charger correctement. L&apos;erreur a été signalée.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              minHeight: 44,
              border: 0,
              borderRadius: 8,
              padding: "0 18px",
              background: "#f26522",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
