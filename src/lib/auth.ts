import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "manager" | "agent";

export type SessionProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  calendar_color: string;
  is_active: boolean;
  signature_html: string | null;
};

/** Current signed-in profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, calendar_color, is_active, signature_html")
    .eq("id", user.id)
    .single();
  if (!data || !data.is_active) return null;
  return data as SessionProfile;
});

/** Require a signed-in, active profile — redirects to sign-in otherwise. */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");
  return profile;
}

/** Require one of the given roles (admin always passes). */
export async function requireRole(...roles: Role[]): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (profile.role !== "admin" && !roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}
