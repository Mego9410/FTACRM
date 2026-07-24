import { createAdminClient } from "@/lib/supabase/admin";

type NotifyInput = { kind: string; title: string; body?: string | null; link_url?: string | null };

/**
 * Create an in-app notification for a profile, respecting their preference.
 * Central helper so notification creation is consistent and honours the user's
 * notify_inapp toggle (falls back to sending if the column/row is unavailable).
 */
export async function notify(profileId: string, input: NotifyInput): Promise<void> {
  if (!profileId) return;
  const admin = createAdminClient();
  const { data: pref } = await admin.from("profiles").select("notify_inapp").eq("id", profileId).maybeSingle();
  if (pref && pref.notify_inapp === false) return;
  await admin.from("notifications").insert({
    profile_id: profileId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link_url: input.link_url ?? null,
  });
}

/** Whether a profile wants email notifications (for future transactional sends). */
export async function wantsEmail(profileId: string): Promise<boolean> {
  if (!profileId) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("notify_email").eq("id", profileId).maybeSingle();
  return data ? data.notify_email !== false : true;
}
