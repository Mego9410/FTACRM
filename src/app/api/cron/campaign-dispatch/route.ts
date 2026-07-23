import { NextResponse, type NextRequest } from "next/server";
import { cronUnauthorized } from "@/lib/http/verify-secret";
import { dispatchCampaigns } from "@/lib/email/dispatch";

export const maxDuration = 60;

/** Campaign dispatcher — on Pro, schedule every minute; heartbeat also runs it. */
export async function GET(request: NextRequest) {
  const unauth = cronUnauthorized(request);
  if (unauth) return unauth;
  return NextResponse.json(await dispatchCampaigns());
}
