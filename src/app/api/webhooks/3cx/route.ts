import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hmacHex, secretsMatch } from "@/lib/http/verify-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInternalExtension, normalisePhone } from "@/lib/telephony/normalise";
import { matchCallToContact } from "@/lib/telephony/match";
import { analyseOneCall } from "@/lib/telephony/process";
import { aiConfigured } from "@/lib/ai/client";

export const maxDuration = 60;

const MIN_DURATION_SECS = 10;

const payloadSchema = z.object({
  call_id: z.string().min(1).max(120),
  direction: z.enum(["inbound", "outbound"]),
  external_number: z.string().max(40),
  extension: z.string().max(10).nullable().optional(),
  started_at: z.string().optional(),
  duration_secs: z.number().int().nonnegative().default(0),
  recording_available: z.boolean().default(false),
  // Some 3CX templates can post the transcript directly; also used for testing.
  transcript: z.string().max(100_000).nullable().optional(),
});

/**
 * 3CX call-journaling webhook (spec §8b.1): logs the call, matches the
 * contact, and — when a transcript is present and AI is configured — runs
 * analysis inline. Idempotent on the 3CX call id.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.THREECX_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "telephony not configured" }, { status: 503 });
  }

  // Read the raw body once so we can verify an HMAC over it (preferred) and
  // still parse it. Auth is constant-time in both paths: an x-webhook-signature
  // (HMAC-SHA256 of the raw body) if 3CX can sign, else a static shared secret.
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const authorised = signature
    ? secretsMatch(signature.replace(/^sha256=/i, ""), hmacHex(secret, raw))
    : secretsMatch(request.headers.get("x-webhook-secret"), secret);
  if (!authorised) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const call = parsed.data;

  // Internal extension-to-extension calls are out of scope.
  if (isInternalExtension(call.external_number) || !normalisePhone(call.external_number)) {
    return NextResponse.json({ skipped: "internal or unparseable number" });
  }

  const admin = createAdminClient();

  // Idempotency: retried webhooks and poll overlap never duplicate.
  const { data: existing } = await admin
    .from("call_recordings")
    .select("id")
    .eq("provider_call_id", call.call_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ duplicate: true });

  const [match, { data: agent }] = await Promise.all([
    matchCallToContact(admin, call.external_number),
    call.extension
      ? admin.from("profiles").select("id, full_name").eq("threecx_extension", call.extension).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const tooShort = call.duration_secs < MIN_DURATION_SECS;
  const mins = Math.max(1, Math.round(call.duration_secs / 60));

  // Journal entry only when we can link it to a record.
  let journalEntryId: string | null = null;
  if (match.contactId) {
    const { data: entry } = await admin
      .from("journal_entries")
      .insert({
        entry_type: "call",
        body: `${call.direction === "inbound" ? "Inbound" : "Outbound"} call, ${mins} min${mins === 1 ? "" : "s"} (logged automatically from 3CX).${match.status === "ambiguous" ? " Contact matched by number — verify." : ""}`,
        author_id: agent?.id ?? null,
        contact_id: match.contactId,
        practice_id: match.practiceId,
        deal_id: match.dealId,
        call_direction: call.direction,
        occurred_at: call.started_at ?? new Date().toISOString(),
      })
      .select("id")
      .single();
    journalEntryId = entry?.id ?? null;
  }

  const hasTranscript = Boolean(call.transcript && !tooShort);
  const { data: recording } = await admin
    .from("call_recordings")
    .insert({
      provider_call_id: call.call_id,
      journal_entry_id: journalEntryId,
      contact_id: match.contactId,
      practice_id: match.practiceId,
      deal_id: match.dealId,
      profile_id: agent?.id ?? null,
      direction: call.direction,
      external_number: normalisePhone(call.external_number),
      extension: call.extension ?? null,
      started_at: call.started_at ?? new Date().toISOString(),
      duration_secs: call.duration_secs,
      recording_available: call.recording_available,
      transcript: hasTranscript ? call.transcript : null,
      transcript_status: hasTranscript
        ? "transcribed"
        : call.recording_available && !tooShort
          ? "pending"
          : "none",
      analysis_status: hasTranscript ? "pending" : "none",
      match_status: match.status,
    })
    .select("id, transcript, direction, contact_id, practice_id, deal_id, profile_id, journal_entry_id")
    .single();

  // Inline analysis when we already have the transcript — best effort.
  let analysed = false;
  if (recording && hasTranscript && aiConfigured()) {
    try {
      await analyseOneCall(recording);
      analysed = true;
    } catch {
      // heartbeat cron retries; row stays analysis_status='pending'
    }
  }

  return NextResponse.json({
    logged: true,
    matched: match.status,
    contact_id: match.contactId,
    journal_entry_id: journalEntryId,
    analysed,
  });
}
