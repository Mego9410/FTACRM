import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { aiConfigured } from "@/lib/ai/client";
import { analyseCallTranscript } from "@/lib/ai/call-analysis";
import { transcribeAudio, transcriptionConfigured } from "@/lib/transcription/deepgram";

/**
 * Telephony processing pipeline (spec §8b.3-8b.4). Called inline from the
 * webhook when possible and by the heartbeat cron as catch-up. Every stage
 * fails soft — a failed transcription/analysis still leaves a logged call.
 */

/** Transcribe stored recordings that are awaiting a transcript. */
export async function transcribePendingCalls(limit = 5): Promise<number> {
  if (!transcriptionConfigured()) return 0;
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("call_recordings")
    .select("id, recording_path, created_at")
    .eq("transcript_status", "pending")
    .not("recording_path", "is", null)
    .limit(limit);

  let done = 0;
  for (const call of pending ?? []) {
    // Bounded retry window: 1 hour, then failed (call stays logged).
    if (Date.now() - new Date(call.created_at).getTime() > 3_600_000) {
      await admin.from("call_recordings").update({ transcript_status: "failed" }).eq("id", call.id);
      continue;
    }
    try {
      const { data: file } = await admin.storage
        .from("call-recordings")
        .download(call.recording_path!);
      if (!file) continue;
      const transcript = await transcribeAudio(await file.arrayBuffer(), file.type || "audio/wav");
      await admin
        .from("call_recordings")
        .update({ transcript, transcript_status: "transcribed", analysis_status: "pending" })
        .eq("id", call.id);
      done += 1;
    } catch {
      // stays pending inside the retry window
    }
  }
  return done;
}

/** Analyse transcribed calls: summary + proposed tasks + optional email draft. */
export async function analysePendingCalls(limit = 5): Promise<number> {
  if (!aiConfigured()) return 0;
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("call_recordings")
    .select("id, transcript, direction, contact_id, practice_id, deal_id, profile_id, journal_entry_id")
    .eq("analysis_status", "pending")
    .not("transcript", "is", null)
    .limit(limit);

  let done = 0;
  for (const call of pending ?? []) {
    try {
      await analyseOneCall(call);
      done += 1;
    } catch {
      await admin.from("call_recordings").update({ analysis_status: "failed" }).eq("id", call.id);
    }
  }
  return done;
}

type PendingCall = {
  id: string;
  transcript: string | null;
  direction: string;
  contact_id: string | null;
  practice_id: string | null;
  deal_id: string | null;
  profile_id: string | null;
  journal_entry_id: string | null;
};

export async function analyseOneCall(call: PendingCall): Promise<void> {
  const admin = createAdminClient();
  if (!call.transcript) return;

  const [{ data: contact }, { data: practice }] = await Promise.all([
    call.contact_id
      ? admin.from("contacts").select("first_name, last_name, company_name").eq("id", call.contact_id).single()
      : Promise.resolve({ data: null }),
    call.practice_id
      ? admin.from("practices").select("display_title").eq("id", call.practice_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const contactName = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name
    : null;

  const analysis = await analyseCallTranscript({
    transcript: call.transcript,
    contactName,
    practiceTitle: practice?.display_title ?? null,
    direction: call.direction,
    callRecordingId: call.id,
  });

  await admin
    .from("call_recordings")
    .update({ summary: analysis.summary, analysis_status: "analysed" })
    .eq("id", call.id);

  // Write the AI summary into the journal entry body (labelled in the UI).
  if (call.journal_entry_id) {
    await admin
      .from("journal_entries")
      .update({ body: analysis.summary })
      .eq("id", call.journal_entry_id);
  }

  const links = {
    call_recording_id: call.id,
    journal_entry_id: call.journal_entry_id,
    contact_id: call.contact_id,
    practice_id: call.practice_id,
    deal_id: call.deal_id,
    for_profile_id: call.profile_id,
  };
  const suggestions = [
    ...analysis.tasks.map((t) => ({
      ...links,
      kind: "task" as const,
      payload: {
        title: t.title,
        details: t.details,
        due_at: t.due_days !== null ? new Date(Date.now() + t.due_days * 86_400_000).toISOString() : null,
      },
    })),
    ...(analysis.email_draft
      ? [{ ...links, kind: "email_draft" as const, payload: analysis.email_draft }]
      : []),
  ];
  if (suggestions.length > 0) {
    await admin.from("ai_suggestions").insert(suggestions);
  }

  if (call.profile_id) {
    await notify(call.profile_id, {
      kind: "call_analysed",
      title: "Call analysed",
      body: `${contactName ?? "A call"} — ${analysis.tasks.length} suggested task${analysis.tasks.length === 1 ? "" : "s"} to review`,
      link_url: call.contact_id ? `/contacts/${call.contact_id}/journal` : "/dashboard",
    });
  }
}

/** Quietly expire stale proposed suggestions (14 days, spec §8b.4). */
export async function expireStaleSuggestions(): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("ai_suggestions")
    .update({ status: "expired" })
    .eq("status", "proposed")
    .lt("expires_at", new Date().toISOString());
}
