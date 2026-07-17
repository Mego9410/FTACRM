import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "My settings" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("graph_connections")
    .select("id, email, status, last_synced_at, last_error")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const graphConfigured = Boolean(process.env.MS_CLIENT_ID && process.env.MS_TENANT_ID);

  return (
    <SettingsClient
      profile={profile}
      connection={connection}
      graphConfigured={graphConfigured}
    />
  );
}
