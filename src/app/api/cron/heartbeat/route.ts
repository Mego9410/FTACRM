import { NextResponse, type NextRequest } from "next/server";
import { cronUnauthorized } from "@/lib/http/verify-secret";
import { dispatchCampaigns } from "@/lib/email/dispatch";
import {
  analysePendingCalls,
  expireStaleSuggestions,
  transcribePendingCalls,
} from "@/lib/telephony/process";

export const maxDuration = 60;

/**
 * Combined heartbeat — one cron slot covering everything that needs a regular
 * tick (Vercel Hobby allows only two cron jobs, once daily each). Runs:
 * campaign dispatch catch-up, telephony transcription + AI analysis catch-up
 * (the 3CX webhook processes inline; this sweeps anything missed), and
 * suggestion expiry. On Pro, schedule this every few minutes.
 */
export async function GET(request: NextRequest) {
  const unauth = cronUnauthorized(request);
  if (unauth) return unauth;
  const [campaigns, transcribed, analysed] = await Promise.all([
    dispatchCampaigns().catch((e) => ({ error: String(e) })),
    transcribePendingCalls().catch(() => 0),
    analysePendingCalls().catch(() => 0),
  ]);
  await expireStaleSuggestions().catch(() => undefined);
  return NextResponse.json({ campaigns, transcribed, analysed });
}
