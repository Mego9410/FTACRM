/**
 * Introduction email — a one-to-one, natural-language follow-up sent to a
 * single buyer after a phone call. Deliberately NOT the branded campaign
 * shell: no gold badge, no dark footer, no unsubscribe link — it's meant to
 * read like an ordinary email the agent typed themselves.
 */

export type IntroBlock = { id: string; label: string; body: string };

/** Title of the auto-created reminder task to send a buyer their intro email. */
export const INTRO_TASK_TITLE = "Send introduction email";

/** The sending agent's sign-off, appended after the closing paragraph. */
export function introSignOff(senderName: string): string {
  return `Kind regards,\n${senderName}\nFrank Taylor & Associates`;
}

/**
 * Assemble the plain-text body: opening, ticked block bodies in order, closing,
 * then the sender's sign-off. Block bodies are passed as strings so a
 * per-email edit (not the stored template) can be used.
 */
export function assembleIntroBody(
  topText: string,
  blockBodies: string[],
  tailText: string,
  signOff?: string,
): string {
  return [topText.trim(), ...blockBodies.map((b) => b.trim()), tailText.trim(), signOff?.trim() ?? ""]
    .filter(Boolean)
    .join("\n\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Minimal HTML wrapper — just paragraphs, nothing that reads as a marketing
 * email. The textual sign-off is already part of bodyText; an optional rich
 * email signature (if the agent has one configured) is appended after it.
 */
export function renderIntroEmail({
  bodyText,
  senderSignatureHtml,
}: {
  bodyText: string;
  senderSignatureHtml?: string | null;
}): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const signature = senderSignatureHtml ? `<div style="margin-top:18px;">${senderSignatureHtml}</div>` : "";

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
