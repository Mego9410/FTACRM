import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DealStagesClient } from "./deal-stages-client";

export const metadata = { title: "Deal stages" };

export default async function DealStagesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("deal_stages")
    .select("id, label, sort_order, is_terminal, is_active")
    .order("sort_order");
  return <DealStagesClient stages={stages ?? []} />;
}
