import { createHmac, timingSafeEqual } from "node:crypto";

/** Hex HMAC-SHA256 of `body` keyed by `secret`. */
export function hmacHex(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Constant-time comparison of two strings. Returns false (never throws) when
 * either value is missing or lengths differ, without leaking timing about the
 * mismatch position. Use for webhook/cron shared-secret checks.
 */
export function secretsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Guard for cron routes: verifies the `Authorization: Bearer <CRON_SECRET>`
 * header in constant time and fails closed when CRON_SECRET is unset (so a
 * missing env var can't be bypassed with a literal "Bearer undefined").
 * Returns null when authorised, or a 401/503 Response when not.
 */
export function cronUnauthorized(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "cron not configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!secretsMatch(provided, secret)) {
    return new Response(JSON.stringify({ error: "unauthorised" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}
