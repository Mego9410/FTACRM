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
  must_change_password: boolean;
  signature_html: string | null;
  phone: string | null;
  job_title: string | null;
  notify_inapp: boolean;
  notify_email: boolean;
};

// Columns guaranteed to exist since early migrations vs. those added later
// (migration 0034). The extended set is fetched tolerantly so a not-yet-applied
// migration can never break sign-in.
const CORE_COLUMNS = "id, full_name, email, role, calendar_color, is_active, must_change_password, signature_html";
const EXTENDED_COLUMNS = `${CORE_COLUMNS}, phone, job_title, notify_inapp, notify_email`;

/** Current signed-in profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Prefer the full row; if the newer columns aren't migrated yet, the query
  // errors and we fall back to the core set with sensible defaults.
  let row = (await supabase.from("profiles").select(EXTENDED_COLUMNS).eq("id", user.id).single()).data as
    | Record<string, unknown>
    | null;
  if (!row) {
    row = (await supabase.from("profiles").select(CORE_COLUMNS).eq("id", user.id).single()).data as
      | Record<string, unknown>
      | null;
  }
  if (!row || !row.is_active) return null;

  return {
    ...(row as unknown as SessionProfile),
    phone: (row.phone as string | null) ?? null,
    job_title: (row.job_title as string | null) ?? null,
    notify_inapp: (row.notify_inapp as boolean | undefined) ?? true,
    notify_email: (row.notify_email as boolean | undefined) ?? true,
  };
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
