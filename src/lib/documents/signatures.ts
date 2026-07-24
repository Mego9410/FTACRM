import { createClient } from "@/lib/supabase/server";

export type SignatureRequestRow = {
  id: string;
  title: string;
  status: "draft" | "sent" | "viewed" | "signed" | "declined" | "cancelled";
  signer_name: string;
  signer_email: string;
  token: string;
  created_at: string;
  signed_at: string | null;
};

/** Signature requests for a record, newest first. */
export async function listSignatureRequests(link: {
  practiceId?: string;
  contactId?: string;
  dealId?: string;
}): Promise<SignatureRequestRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("signature_requests")
    .select("id, title, status, signer_name, signer_email, token, created_at, signed_at")
    .order("created_at", { ascending: false });
  if (link.practiceId) query = query.eq("practice_id", link.practiceId);
  if (link.contactId) query = query.eq("contact_id", link.contactId);
  if (link.dealId) query = query.eq("deal_id", link.dealId);
  const { data } = await query;
  return (data ?? []) as SignatureRequestRow[];
}
