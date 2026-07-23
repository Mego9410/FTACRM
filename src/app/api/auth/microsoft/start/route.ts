import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth";
import { authorizeUrl, graphConfigured } from "@/lib/graph";

export async function GET() {
  await requireProfile();
  if (!graphConfigured()) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?ms=not_configured`,
    );
  }
  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(authorizeUrl(state));
}
