/** Branded FTA email shell — inline-styled HTML that renders everywhere. */

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain-text-with-tags body → paragraphs inside the branded shell. */
export function renderEmailShell({
  bodyText,
  unsubscribeUrl,
  senderName,
}: {
  bodyText: string;
  unsubscribeUrl: string;
  senderName: string;
}): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.65;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!doctype html>
<html lang="en-GB">
<body style="margin:0;padding:0;background:#F4F4F3;font-family:'Hanken Grotesk',-apple-system,'Segoe UI',sans-serif;color:#5E5E5A;font-size:16px;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E7E7E4;">
      <div style="padding:24px 32px;border-bottom:1px solid #E7E7E4;">
        <span style="display:inline-block;background:#E4AD25;color:#0F0F0A;font-weight:800;font-size:15px;letter-spacing:-0.02em;padding:8px 14px;border-radius:12px;">Frank Taylor &amp; Associates</span>
      </div>
      <div style="padding:32px;">
        ${paragraphs}
        <p style="margin:24px 0 0;line-height:1.5;color:#1A1A17;font-weight:600;">${escapeHtml(senderName)}<br/><span style="font-weight:400;color:#8C8C88;font-size:14px;">Frank Taylor &amp; Associates</span></p>
      </div>
      <div style="background:#090909;color:#B6B6B2;padding:24px 32px;font-size:12.5px;line-height:1.6;">
        <p style="margin:0 0 8px;">Frank Taylor &amp; Associates — the UK's leading independent dental practice sales agency. Guiding practice owners with integrity since 1988.</p>
        <p style="margin:0;">You're receiving this because you registered your interest with us.
        <a href="${unsubscribeUrl}" style="color:#E4AD25;">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
