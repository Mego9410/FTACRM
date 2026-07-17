import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, exchangeCode, graphConfigured, graphGet } from "@/lib/graph";

export async function GET(request: NextRequest) {
  const me = await requireProfile();
  const back = (q: string) => NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?ms=${q}`);
  if (!graphConfigured()) return back("not_configured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("ms_oauth_state")?.value;
  cookieStore.delete("ms_oauth_state");
  if (!code || !state || !expected || state !== expected) return back("error");

  const tokens = await exchangeCode(code);
  if (tokens.error || !tokens.refresh_token) return back("error");

  const profile = await graphGet<{ id: string; mail: string | null; userPrincipalName: string }>(
    tokens.access_token,
    "/me",
  );

  const admin = createAdminClient();
  const { error } = await admin.from("graph_connections").upsert(
    {
      profile_id: me.id,
      ms_user_id: profile.id,
      email: profile.mail ?? profile.userPrincipalName,
      refresh_token_enc: encryptToken(tokens.refresh_token),
      scopes: ["Mail.Read", "Mail.Send", "Calendars.ReadWrite"],
      status: "active",
      last_synced_at: null,
      last_error: null,
    },
    { onConflict: "profile_id" },
  );
  if (error) return back("error");
  return back("connected");
}
