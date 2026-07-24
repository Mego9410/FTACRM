"use client";

import * as React from "react";
import "@/styles/globals.css";

// Catches errors thrown in the root layout itself. Must render its own
// <html>/<body>. Kept dependency-free so it works even if the shell is broken.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", background: "#F4F4F3", color: "#1A1A17" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, maxWidth: 380, fontSize: 14, color: "#5E5E5A" }}>
            We hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, background: "#E4AD25", color: "#0F0F0A", fontWeight: 700, border: "none", borderRadius: 10, padding: "12px 22px", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
