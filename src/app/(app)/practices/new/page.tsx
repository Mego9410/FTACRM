import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { PracticeForm } from "../practice-form";

export const metadata = { title: "New practice" };

export default async function NewPracticePage() {
  const supabase = await createClient();
  const [fundings, tenures, specialisms, { data: owners }, { data: branches }] =
    await Promise.all([
      getLookup("funding_type"),
      getLookup("tenure_type"),
      getLookup("specialism"),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New practice" subtitle="Starts in Valuation — move it through the lifecycle from the record" />
      <PracticeForm
        lookups={{ fundings, tenures, specialisms }}
        owners={owners ?? []}
        branches={branches ?? []}
      />
    </div>
  );
}
