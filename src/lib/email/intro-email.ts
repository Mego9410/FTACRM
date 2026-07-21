/**
 * Introduction email — a one-to-one, natural-language follow-up sent to a
 * single buyer after a phone call. Deliberately NOT the branded campaign
 * shell: no gold badge, no dark footer, no unsubscribe link — it's meant to
 * read like an ordinary email the agent typed themselves.
 */

export type IntroBlock = { id: string; label: string; body: string };

/** Assemble the plain-text body: top paragraph, ticked blocks in order, tail paragraph. */
export function assembleIntroBody(topText: string, blocks: IntroBlock[], tailText: string): string {
  return [topText.trim(), ...blocks.map((b) => b.body.trim()), tailText.trim()]
    .filter(Boolean)
    .join("\n\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal HTML wrapper — paragraphs and a signature, nothing that reads as a marketing email. */
export function renderIntroEmail({
  bodyText,
  senderName,
  senderSignatureHtml,
}: {
  bodyText: string;
  senderName: string;
  senderSignatureHtml?: string | null;
}): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const signature = senderSignatureHtml
    ? `<div style="margin-top:18px;">${senderSignatureHtml}</div>`
    : `<p style="margin:18px 0 0;line-height:1.6;">Kind regards,<br/>${escapeHtml(senderName)}<br/>Frank Taylor &amp; Associates</p>`;

  return `<!doctype html>
<html lang="en-GB">
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#1a1a17;font-size:15px;">
  <div style="max-width:600px;margin:0 auto;padding:16px;">
    ${paragraphs}
    ${signature}
  </div>
</body>
</html>`;
}
