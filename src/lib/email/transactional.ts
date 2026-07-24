import { getEmailProvider } from "@/lib/email/provider";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Branded shell for account/transactional emails (no marketing unsubscribe footer). */
function accountShell(inner: string): string {
  return `<!doctype html>
<html lang="en-GB">
<body style="margin:0;padding:0;background:#F4F4F3;font-family:'Hanken Grotesk',-apple-system,'Segoe UI',sans-serif;color:#5E5E5A;font-size:16px;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E7E7E4;">
      <div style="padding:24px 32px;border-bottom:1px solid #E7E7E4;">
        <span style="display:inline-block;background:#E4AD25;color:#0F0F0A;font-weight:800;font-size:15px;letter-spacing:-0.02em;padding:8px 14px;border-radius:12px;">Frank Taylor &amp; Associates</span>
      </div>
      <div style="padding:32px;color:#1A1A17;">
        ${inner}
      </div>
      <div style="background:#090909;color:#B6B6B2;padding:20px 32px;font-size:12.5px;line-height:1.6;">
        <p style="margin:0;">Frank Taylor &amp; Associates — practice sales CRM. This is an automated account message; please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#E4AD25;color:#0F0F0A;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:12px;">${esc(label)}</a>`;

export type TransactionalResult = { emailed: boolean; error?: string };

/**
 * Welcome a new staff member: their temporary password plus a sign-in link.
 * They'll be forced to set a new password on first sign-in. Returns emailed:false
 * (with no error) when no email provider is linked yet — the caller then falls
 * back to showing the admin the credentials to share manually.
 */
export async function sendInviteEmail(opts: {
  to: string;
  fullName: string;
  tempPassword: string;
  signInUrl: string;
}): Promise<TransactionalResult> {
  const provider = getEmailProvider();
  if (!provider.configured) return { emailed: false };

  const firstName = opts.fullName.trim().split(/\s+/)[0] || "there";
  const inner =
    `<h1 style="font-size:20px;margin:0 0 16px;color:#0F0F0A;">Welcome to the FTA CRM</h1>` +
    `<p style="margin:0 0 16px;line-height:1.6;">Hi ${esc(firstName)}, an account has been created for you on the Frank Taylor &amp; Associates CRM.</p>` +
    `<p style="margin:0 0 8px;line-height:1.6;">Sign in with your email and this temporary password:</p>` +
    `<p style="margin:0 0 20px;"><code style="display:inline-block;background:#F4F4F3;border:1px solid #E7E7E4;border-radius:8px;padding:8px 12px;font-size:15px;color:#0F0F0A;">${esc(opts.tempPassword)}</code></p>` +
    `<p style="margin:0 0 24px;">${btn(opts.signInUrl, "Sign in for the first time")}</p>` +
    `<p style="margin:0;line-height:1.6;color:#8C8C88;font-size:14px;">You'll be asked to set your own password straight away. If the button doesn't work, go to <a href="${esc(opts.signInUrl)}" style="color:#B8860B;">${esc(opts.signInUrl)}</a>.</p>`;

  const res = await provider.send({ to: opts.to, subject: "Your FTA CRM account", html: accountShell(inner) });
  return res.ok ? { emailed: true } : { emailed: false, error: res.error };
}

/** Notify a user their password was reset by an admin, with a sign-in link. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  fullName: string;
  tempPassword: string;
  signInUrl: string;
}): Promise<TransactionalResult> {
  const provider = getEmailProvider();
  if (!provider.configured) return { emailed: false };
  const firstName = opts.fullName.trim().split(/\s+/)[0] || "there";
  const inner =
    `<h1 style="font-size:20px;margin:0 0 16px;color:#0F0F0A;">Your password was reset</h1>` +
    `<p style="margin:0 0 16px;line-height:1.6;">Hi ${esc(firstName)}, an administrator has reset your FTA CRM password. Use this temporary password to sign in:</p>` +
    `<p style="margin:0 0 20px;"><code style="display:inline-block;background:#F4F4F3;border:1px solid #E7E7E4;border-radius:8px;padding:8px 12px;font-size:15px;color:#0F0F0A;">${esc(opts.tempPassword)}</code></p>` +
    `<p style="margin:0 0 24px;">${btn(opts.signInUrl, "Sign in")}</p>` +
    `<p style="margin:0;line-height:1.6;color:#8C8C88;font-size:14px;">You'll be asked to set a new password after signing in.</p>`;
  const res = await provider.send({ to: opts.to, subject: "Your FTA CRM password was reset", html: accountShell(inner) });
  return res.ok ? { emailed: true } : { emailed: false, error: res.error };
}
