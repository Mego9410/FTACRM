import { aiJson } from "./client";

/**
 * AI call analysis (spec §8b.4): transcript → summary + proposed tasks +
 * optional draft follow-up email. FTA voice rules baked into the system
 * prompt; output is strictly structured for the review UI. Nothing here acts —
 * suggestions wait for human approval.
 */

export type CallAnalysis = {
  summary: string;
  outcome: "connected" | "voicemail" | "no_answer" | "other";
  tasks: { title: string; details: string | null; due_days: number | null }[];
  email_draft: { subject: string; body: string } | null;
};

const SYSTEM = `You are the CRM assistant for Frank Taylor & Associates (FTA), the UK's leading
independent dental practice sales agency. You analyse transcripts of phone calls between an FTA
agent and a contact (a practice seller, buyer, or solicitor).

Rules:
- Be factual. Only state things said in the transcript; never invent commitments.
- British English, sentence case, calm professional tone. No emoji.
- Summaries: outcome first, then key points, then commitments made by each side. 3-6 sentences.
- Tasks: only for genuine commitments or clear follow-ups. due_days = whole days from today
  implied by the conversation ("by Friday", "next week"), or null when no timeframe was given.
- email_draft: only when the call clearly warrants a written follow-up; recap the call and
  confirm next steps in FTA's reassuring, seller-first voice. Otherwise null.
- Respond with ONLY a JSON object, no other text, exactly this shape:
{"summary": string, "outcome": "connected"|"voicemail"|"no_answer"|"other",
 "tasks": [{"title": string, "details": string|null, "due_days": number|null}],
 "email_draft": {"subject": string, "body": string} | null}`;

export async function analyseCallTranscript(input: {
  transcript: string;
  contactName: string | null;
  practiceTitle: string | null;
  direction: string;
  callRecordingId: string;
}): Promise<CallAnalysis> {
  const context = [
    `Direction: ${input.direction} call`,
    input.contactName ? `Contact: ${input.contactName}` : "Contact: unknown",
    input.practiceTitle ? `Related practice: ${input.practiceTitle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await aiJson<CallAnalysis>({
    kind: "summarise_call",
    system: SYSTEM,
    user: `${context}\n\nTranscript:\n${input.transcript.slice(0, 30_000)}`,
    callRecordingId: input.callRecordingId,
  });

  // Defensive shape enforcement — a malformed model reply must not corrupt the queue.
  return {
    summary: String(result.summary ?? "").slice(0, 4000),
    outcome: (["connected", "voicemail", "no_answer", "other"] as const).includes(result.outcome)
      ? result.outcome
      : "other",
    tasks: (Array.isArray(result.tasks) ? result.tasks : []).slice(0, 6).map((t) => ({
      title: String(t.title ?? "").slice(0, 200),
      details: t.details ? String(t.details).slice(0, 1000) : null,
      due_days: typeof t.due_days === "number" && t.due_days >= 0 ? Math.round(t.due_days) : null,
    })),
    email_draft: result.email_draft
      ? {
          subject: String(result.email_draft.subject ?? "").slice(0, 200),
          body: String(result.email_draft.body ?? "").slice(0, 8000),
        }
      : null,
  };
}
