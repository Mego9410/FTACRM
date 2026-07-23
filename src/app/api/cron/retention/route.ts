import { NextResponse, type NextRequest } from "next/server";
import { cronUnauthorized } from "@/lib/http/verify-secret";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * [SEV-MED-04] Retention purge for call recordings and transcripts. Deletes
 * call_recordings older than RETENTION_DAYS (default 365) and their AI jobs
 * (cascade). Not wired into vercel.json — schedule it there once you've agreed
 * a retention window, or trigger it manually with the CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const unauth = cronUnauthorized(request);
  if (unauth) return unauth;

  const days = Number(process.env.RETENTION_DAYS ?? "365");
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const admin = createAdminClient();

  const { data: old } = await admin
    .from("call_recordings")
    .select("id")
    .lt("created_at", cutoff);
  const ids = (old ?? []).map((r) => r.id);
  if (ids.length === 0) return NextResponse.json({ purged: 0, cutoff });

  // ai_jobs / ai_suggestions cascade on call_recording_id delete.
  const { error } = await admin.from("call_recordings").delete().in("id", ids);
  if (error) return NextResponse.json({ error: "purge failed" }, { status: 500 });

  return NextResponse.json({ purged: ids.length, cutoff, retentionDays: days });
}
