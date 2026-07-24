import { createClient } from "@/lib/supabase/server";

export type SignerSummary = {
  party_label: string;
  status: "sent" | "viewed" | "signed" | "declined";
  signed_at: string | null;
  signer_name: string;
  token: string;
};

export type SignatureRequestRow = {
  id: string;
  title: string;
  status: "draft" | "sent" | "viewed" | "signed" | "declined" | "cancelled";
  created_at: string;
  signed_at: string | null;
  signers: SignerSummary[];
};

/** Signature requests for a record, newest first, with each party's progress. */
export async function listSignatureRequests(link: {
  practiceId?: string;
  contactId?: string;
  dealId?: string;
}): Promise<SignatureRequestRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("signature_requests")
    .select("id, title, status, created_at, signed_at")
    .order("created_at", { ascending: false });
  if (link.practiceId) query = query.eq("practice_id", link.practiceId);
  if (link.contactId) query = query.eq("contact_id", link.contactId);
  if (link.dealId) query = query.eq("deal_id", link.dealId);
  const { data: reqs } = await query;
  const requests = (reqs ?? []) as Omit<SignatureRequestRow, "signers">[];
  if (requests.length === 0) return [];

  const { data: signers } = await supabase
    .from("signature_signers")
    .select("request_id, party_label, status, signed_at, signer_name, token, sign_order")
    .in(
      "request_id",
      requests.map((r) => r.id),
    )
    .order("sign_order");
  const byRequest = new Map<string, SignerSummary[]>();
  for (const s of (signers ?? []) as (SignerSummary & { request_id: string })[]) {
    const list = byRequest.get(s.request_id) ?? [];
    list.push({ party_label: s.party_label, status: s.status, signed_at: s.signed_at, signer_name: s.signer_name, token: s.token });
    byRequest.set(s.request_id, list);
  }

  return requests.map((r) => ({ ...r, signers: byRequest.get(r.id) ?? [] }));
}
