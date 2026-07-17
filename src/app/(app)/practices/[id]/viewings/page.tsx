import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { ViewingsClient } from "./viewings-client";

export default async function PracticeViewingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: viewings } = await supabase
    .from("viewings")
    .select(
      "id, scheduled_at, duration_mins, status, feedback, contacts!viewings_buyer_contact_id_fkey(id, first_name, last_name, company_name)",
    )
    .eq("practice_id", id)
    .order("scheduled_at", { ascending: false });

  return (
    <ViewingsClient
      practiceId={id}
      viewings={(viewings ?? []).map((v) => {
        const buyer = v.contacts as unknown as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
        } | null;
        return {
          id: v.id,
          scheduled_at: v.scheduled_at,
          duration_mins: v.duration_mins,
          status: v.status,
          feedback: v.feedback,
          buyerId: buyer?.id ?? null,
          buyerName: buyer ? contactName(buyer) : "Unknown buyer",
        };
      })}
    />
  );
}
