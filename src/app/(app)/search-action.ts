"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type SearchHit = {
  kind: "contact" | "practice" | "deal";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export async function globalSearch(q: string): Promise<SearchHit[]> {
  await requireProfile();
  const supabase = await createClient();
  const term = q.replace(/[%_]/g, "").trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;

  const [contacts, practices, deals] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, company_name, email, phone, mobile, roles, ref")
      .or(
        `first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like},phone.ilike.${like},mobile.ilike.${like},ref.ilike.${like}`,
      )
      .is("archived_at", null)
      .limit(6),
    supabase
      .from("practices")
      .select("id, ref, display_title, name, town, postcode, status")
      .or(`display_title.ilike.${like},name.ilike.${like},town.ilike.${like},postcode.ilike.${like},ref.ilike.${like}`)
      .is("archived_at", null)
      .limit(6),
    supabase
      .from("deals")
      .select("id, ref, status, practices!deals_practice_id_fkey(display_title)")
      .ilike("ref", like)
      .limit(4),
  ]);

  const hits: SearchHit[] = [];
  for (const c of contacts.data ?? []) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || c.ref;
    hits.push({
      kind: "contact",
      id: c.id,
      title: name,
      subtitle: [c.email, (c.roles as string[]).join(", ")].filter(Boolean).join(" · ") || null,
      href: `/contacts/${c.id}`,
    });
  }
  for (const p of practices.data ?? []) {
    hits.push({
      kind: "practice",
      id: p.id,
      title: p.display_title,
      subtitle: [p.ref, p.town, p.status.replace(/_/g, " ")].filter(Boolean).join(" · "),
      href: `/practices/${p.id}`,
    });
  }
  for (const d of deals.data ?? []) {
    const practice = d.practices as unknown as { display_title: string } | null;
    hits.push({
      kind: "deal",
      id: d.id,
      title: practice?.display_title ?? d.ref,
      subtitle: `${d.ref} · ${d.status.replace(/_/g, " ")}`,
      href: `/deals/${d.id}`,
    });
  }
  return hits;
}
