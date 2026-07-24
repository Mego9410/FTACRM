/**
 * Email provider abstraction. This build ships WITHOUT a linked provider —
 * campaigns can be drafted, segmented, previewed and queued, but dispatch
 * requires wiring a provider (Resend adapter slot below).
 *
 * To link Resend later: implement ResendProvider against this interface,
 * set RESEND_API_KEY, and getEmailProvider() picks it up — no other code
 * changes needed.
 */

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type SendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string; permanent: boolean };

export interface EmailProvider {
  readonly name: string;
  readonly configured: boolean;
  send(email: OutboundEmail): Promise<SendResult>;
}

class NotConfiguredProvider implements EmailProvider {
  readonly name = "none";
  readonly configured = false;
  async send(): Promise<SendResult> {
    return {
      ok: false,
      error: "No email provider is linked. See docs/integrations.md to connect Resend.",
      permanent: true,
    };
  }
}

/** The "from" address for outbound mail, e.g. "FTA <hello@ft-associates.com>". */
export function emailFromAddress(): string {
  return process.env.RESEND_FROM || process.env.EMAIL_FROM || "Frank Taylor & Associates <no-reply@ft-associates.com>";
}

/**
 * Resend adapter. Lights up automatically once RESEND_API_KEY is set — no other
 * code changes needed. Uses the REST API directly (no SDK dependency).
 */
class ResendProvider implements EmailProvider {
  readonly name = "resend";
  readonly configured = true;
  constructor(private readonly apiKey: string) {}

  async send(email: OutboundEmail): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: emailFromAddress(),
          to: [email.to],
          subject: email.subject,
          html: email.html,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
          ...(email.headers ? { headers: email.headers } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        // 4xx (bad address, etc.) are permanent; 5xx/network are retryable.
        return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}`, permanent: res.status >= 400 && res.status < 500 };
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, providerMessageId: data.id ?? "unknown" };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error", permanent: false };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return new ResendProvider(process.env.RESEND_API_KEY);
  return new NotConfiguredProvider();
}

export function emailSendingEnabled(): boolean {
  return getEmailProvider().configured;
}
