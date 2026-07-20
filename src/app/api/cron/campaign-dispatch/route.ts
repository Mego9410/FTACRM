import { NextResponse, type NextRequest } from "next/server";
import { dispatchCampaigns } from "@/lib/email/dispatch";

export const maxDuration = 60;

/** Campaign dispatcher — on Pro, schedule every minute; heartbeat also runs it. */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  return NextResponse.json(await dispatchCampaigns());
}
