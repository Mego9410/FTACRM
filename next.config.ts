import type { NextConfig } from "next";

// [SEV-HIGH-01] Security response headers. The framing/sniffing/referrer/
// permissions/HSTS headers are enforced. The CSP is shipped Report-Only first
// so it cannot break the app (React hydration inline scripts, Tailwind inline
// styles, the sandboxed email-preview iframes, Supabase XHR/WS, signed-URL
// images); review violation reports, then promote to enforcing by renaming the
// header to `Content-Security-Policy`.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
