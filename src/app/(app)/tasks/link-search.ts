"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/** The kinds of record a task can be tagged against. */
export type LinkType = "practice" | "buyer" | "seller" | "solicitor" | "deal";

export type LinkColumn = "practice_id" | "contact_id" | "deal_id";

export type LinkHit = {
  type: LinkType;
  column: LinkColumn;
  id: string;
  title: string;
  subtitle: string | null;
};

const CONTACT_ROLE: Partial<Record<LinkType, string>> = {
  buyer: "buyer",
  seller: "seller",
  solicitor: "solicitor",
};

export async function searchTaskLinks(type: LinkType, q: string): Promise<LinkHit[]> {
  await requireProfile();
  const term = q.replace(/[%_]/g, "").trim();
  if (term.length < 2) return [];
  const supabase = await createClient();
  const like = `%${term}%`;

  if (type === "practice") {
    const { data } = await supabase
      .from("practices")
      .select("id, ref, display_title, town, status")
      .or(`display_title.ilike.${like},name.ilike.${like},town.ilike.${like},postcode.ilike.${like},ref.ilike.${like}`)
      .is("archived_at", null)
      .limit(8);
    return (data ?? []).map((p) => ({
      type,
      column: "practice_id" as const,
      id: p.id,
      title: p.display_title,
      subtitle: [p.ref, p.town, p.status?.replace(/_/g, " ")].filter(Boolean).join(" · ") || null,
    }));
  }

  if (type === "deal") {
    const { data } = await supabase
      .from("deals")
      .select("id, ref, status, practices!deals_practice_id_fkey(display_title)")
      .ilike("ref", like)
      .limit(8);
    return (data ?? []).map((d) => {
      const practice = d.practices as unknown as { display_title: string } | null;
      return {
        type,
        column: "deal_id" as const,
        id: d.id,
        title: practice?.display_title ?? d.ref,
        subtitle: [d.ref, d.status?.replace(/_/g, " ")].filter(Boolean).join(" · ") || null,
      };
    });
  }

  // buyer / seller / solicitor → contacts filtered by role
  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, company_name, email, mobile, phone, ref, roles")
    .or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like},ref.ilike.${like}`)
    .is("archived_at", null)
    .limit(8);
  const role = CONTACT_ROLE[type];
  if (role) query = query.contains("roles", [role]);
  const { data } = await query;
  return (data ?? []).map((c) => ({
    type,
    column: "contact_id" as const,
    id: c.id,
    title: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || c.ref || "Contact",
    subtitle: [c.email, c.mobile ?? c.phone].filter(Boolean).join(" · ") || null,
  }));
}
