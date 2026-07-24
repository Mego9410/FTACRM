import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { NotificationsList } from "./notifications-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link_url, read_at, created_at")
    .eq("profile_id", me.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" subtitle="Everything the CRM has flagged for you" />
      <NotificationsList initial={data ?? []} />
    </div>
  );
}
