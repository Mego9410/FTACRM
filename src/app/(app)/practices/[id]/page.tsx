import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PracticeForm, type PracticeFormValues } from "../practice-form";

export default async function PracticeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: practice }, fundings, tenures, structures, specialisms, { data: owners }, { data: branches }] =
    await Promise.all([
      supabase.from("practices").select("*").eq("id", id).maybeSingle(),
      getLookup("funding_type"),
      getLookup("tenure_type"),
      getLookup("deal_structure"),
      getLookup("specialism"),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    ]);
  if (!practice) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PracticeForm
        initial={practice as unknown as PracticeFormValues}
        lookups={{ fundings, tenures, structures, specialisms }}
        owners={owners ?? []}
        branches={branches ?? []}
      />
    </div>
  );
}
