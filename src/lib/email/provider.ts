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

export function getEmailProvider(): EmailProvider {
  // Resend adapter intentionally not implemented in this build (per scope).
  // if (process.env.RESEND_API_KEY) return new ResendProvider(process.env.RESEND_API_KEY);
  return new NotConfiguredProvider();
}

export function emailSendingEnabled(): boolean {
  return getEmailProvider().configured;
}
