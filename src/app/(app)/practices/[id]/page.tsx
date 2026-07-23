import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLookup } from "@/lib/lookups";
import { PracticeHeadline } from "@/components/practices/practice-headline";
import { PracticeRecord } from "../practice-record";
import type { PracticeFormValues } from "../practice-form";

export default async function PracticeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: practice }, fundings, tenures, entities, specialisms] = await Promise.all([
    supabase.from("practices").select("*").eq("id", id).maybeSingle(),
    getLookup("funding_type"),
    getLookup("tenure_type"),
    getLookup("trading_entity"),
    getLookup("specialism"),
  ]);
  if (!practice) notFound();

  const p = practice as Record<string, unknown>;
  const headlinePath = (p.headline_image_path as string | null | undefined) ?? null;
  let headlineUrl: string | null = null;
  if (headlinePath) {
    const { data: signed } = await createAdminClient()
      .storage.from("documents")
      .createSignedUrl(headlinePath, 60 * 60);
    headlineUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <PracticeHeadline
          practiceId={id}
          imageUrl={headlineUrl}
          lat={(p.lat as number | null) ?? null}
          lng={(p.lng as number | null) ?? null}
        />
      </div>
      <div className="min-w-0">
        <PracticeRecord
          practice={practice as unknown as PracticeFormValues & { id: string }}
          lookups={{ fundings, tenures, entities, specialisms }}
        />
      </div>
    </div>
  );
}
