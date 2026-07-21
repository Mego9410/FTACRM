import { createClient } from "@/lib/supabase/server";
import { ChecklistCLient } from "./checklist-client";
import type { JournalLink } from "./journal";

export async function Checklist({
  link,
  appliesTo,
  path,
}: {
  link: JournalLink;
  appliesTo: "contact" | "practice" | "deal";
  path: string;
}) {
  const supabase = await createClient();

  let instancesQuery = supabase
    .from("checklist_instances")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });
  if (link.contactId) instancesQuery = instancesQuery.eq("contact_id", link.contactId);
  else if (link.practiceId) instancesQuery = instancesQuery.eq("practice_id", link.practiceId);
  else if (link.dealId) instancesQuery = instancesQuery.eq("deal_id", link.dealId);

  const [{ data: instances }, { data: templates }] = await Promise.all([
    instancesQuery,
    supabase
      .from("checklist_templates")
      .select("id, name")
      .eq("applies_to", appliesTo)
      .eq("is_active", true)
      .order("name"),
  ]);

  const instanceIds = (instances ?? []).map((i) => i.id);
  const { data: items } = instanceIds.length
    ? await supabase
        .from("checklist_items")
        .select("id, instance_id, label, checked, checked_at, sort_order, profiles!checklist_items_checked_by_fkey(full_name)")
        .in("instance_id", instanceIds)
        .order("sort_order")
    : { data: [] };

  // Notes fetched separately and tolerantly so an un-migrated `note` column
  // (migration 0013) can't break the checklist tab.
  const noteById = new Map<string, string | null>();
  if (instanceIds.length) {
    const { data: noteRows } = await supabase
      .from("checklist_items")
      .select("id, note")
      .in("instance_id", instanceIds);
    for (const r of (noteRows ?? []) as { id: string; note: string | null }[]) noteById.set(r.id, r.note);
  }

  return (
    <ChecklistCLient
      instances={(instances ?? []).map((i) => ({
        ...i,
        items: (items ?? [])
          .filter((it) => it.instance_id === i.id)
          .map((it) => ({
            id: it.id,
            label: it.label,
            checked: it.checked,
            checked_at: it.checked_at,
            checked_by: (it.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
            note: noteById.get(it.id) ?? null,
          })),
      }))}
      templates={templates ?? []}
      link={{ contact_id: link.contactId ?? null, practice_id: link.practiceId ?? null, deal_id: link.dealId ?? null }}
      path={path}
    />
  );
}
