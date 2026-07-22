import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PracticeRecord } from "../practice-record";
import type { PracticeFormValues } from "../practice-form";

export default async function PracticeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: practice }, fundings, tenures, specialisms] = await Promise.all([
    supabase.from("practices").select("*").eq("id", id).maybeSingle(),
    getLookup("funding_type"),
    getLookup("tenure_type"),
    getLookup("specialism"),
  ]);
  if (!practice) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PracticeRecord
        practice={practice as unknown as PracticeFormValues & { id: string }}
        lookups={{ fundings, tenures, specialisms }}
      />
    </div>
  );
}
