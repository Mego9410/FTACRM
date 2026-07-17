import { createClient } from "@/lib/supabase/server";
import { ChecklistsClient } from "./checklists-client";

export const metadata = { title: "Checklists" };

export default async function ChecklistsPage() {
  const supabase = await createClient();
  const [{ data: templates }, { data: items }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name, applies_to, is_active").order("name"),
    supabase.from("checklist_template_items").select("id, template_id, label, sort_order").order("sort_order"),
  ]);
  const withItems = (templates ?? []).map((t) => ({
    ...t,
    items: (items ?? []).filter((i) => i.template_id === t.id),
  }));
  return <ChecklistsClient templates={withItems} />;
}
