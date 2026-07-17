import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { CalendarClient } from "./calendar-client";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const me = await requireProfile();
  const supabase = await createClient();
  const [{ data: team }, eventTypes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, calendar_color")
      .eq("is_active", true)
      .order("full_name"),
    getLookup("event_type"),
  ]);

  return (
    <div>
      <PageHeader title="Calendar" subtitle="The whole team's diary — overlay whoever you need" />
      <CalendarClient me={me.id} team={team ?? []} eventTypes={eventTypes} />
    </div>
  );
}
