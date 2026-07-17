import { createClient } from "@/lib/supabase/server";

/**
 * Campaign segment definition — serialisable filter over buyer/seller
 * contacts. Evaluated at preview time (counts) and snapshot time (send).
 */
export type SegmentDefinition = {
  roles?: string[];
  temperature?: string[];
  funding_type_ids?: string[];
  tenure_type_ids?: string[];
  specialism_ids?: string[];
  deal_structure_ids?: string[];
  min_budget?: number | null; // buyer max_price >= this
  max_budget?: number | null; // buyer min_price <= this (their range overlaps)
  not_contacted_days?: number | null;
  owner_id?: string | null;
  explicit_contact_ids?: string[]; // from matching bulk-select
};

export type SegmentEvaluation = {
  eligible: { contact_id: string; email: string; name: string }[];
  excluded: { reason: string; count: number }[];
  total_matched: number;
};

/** Resolve a segment to concrete recipients, applying consent + suppression. */
export async function evaluateSegment(def: SegmentDefinition): Promise<SegmentEvaluation> {
  const supabase = await createClient();

  let contacts: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    do_not_contact: boolean;
    consent_email: boolean | null;
  }[] = [];

  if (def.explicit_contact_ids && def.explicit_contact_ids.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("id, email, first_name, last_name, company_name, do_not_contact, consent_email")
      .in("id", def.explicit_contact_ids)
      .is("archived_at", null);
    contacts = data ?? [];
  } else {
    let query = supabase
      .from("contacts")
      .select(
        "id, email, first_name, last_name, company_name, do_not_contact, consent_email, temperature, last_contacted_at, owner_id",
      )
      .is("archived_at", null)
      .limit(50000);
    query = query.overlaps("roles", def.roles && def.roles.length > 0 ? def.roles : ["buyer"]);
    if (def.temperature && def.temperature.length > 0) query = query.in("temperature", def.temperature);
    if (def.owner_id) query = query.eq("owner_id", def.owner_id);
    if (def.not_contacted_days) {
      query = query.or(
        `last_contacted_at.is.null,last_contacted_at.lt.${new Date(Date.now() - def.not_contacted_days * 86_400_000).toISOString()}`,
      );
    }
    const { data } = await query;
    contacts = data ?? [];

    // Criteria-based facets require the buyer_criteria join.
    const needsCriteria =
      (def.funding_type_ids?.length ?? 0) > 0 ||
      (def.tenure_type_ids?.length ?? 0) > 0 ||
      (def.specialism_ids?.length ?? 0) > 0 ||
      (def.deal_structure_ids?.length ?? 0) > 0 ||
      def.min_budget != null ||
      def.max_budget != null;
    if (needsCriteria) {
      const { data: criteria } = await supabase
        .from("buyer_criteria")
        .select("contact_id, funding_type_ids, tenure_type_ids, specialism_ids, deal_structure_ids, min_price, max_price");
      const byContact = new Map((criteria ?? []).map((c) => [c.contact_id, c]));
      const overlaps = (a: string[] | null | undefined, b: string[] | undefined) =>
        !b || b.length === 0 || (a ?? []).some((x) => b.includes(x));
      contacts = contacts.filter((c) => {
        const crit = byContact.get(c.id);
        if (!crit) return false;
        if (!overlaps(crit.funding_type_ids, def.funding_type_ids)) return false;
        if (!overlaps(crit.tenure_type_ids, def.tenure_type_ids)) return false;
        if (!overlaps(crit.specialism_ids, def.specialism_ids)) return false;
        if (!overlaps(crit.deal_structure_ids, def.deal_structure_ids)) return false;
        if (def.min_budget != null && !(crit.max_price == null || Number(crit.max_price) >= def.min_budget))
          return false;
        if (def.max_budget != null && !(crit.min_price == null || Number(crit.min_price) <= def.max_budget))
          return false;
        return true;
      });
    }
  }

  const total = contacts.length;
  const excluded: Record<string, number> = {};
  const bump = (reason: string) => {
    excluded[reason] = (excluded[reason] ?? 0) + 1;
  };

  const withEmail = contacts.filter((c) => {
    if (!c.email) {
      bump("no email address");
      return false;
    }
    return true;
  });
  const consented = withEmail.filter((c) => {
    if (c.do_not_contact) {
      bump("do not contact");
      return false;
    }
    if (c.consent_email === false) {
      bump("email consent withdrawn");
      return false;
    }
    return true;
  });

  const emails = consented.map((c) => c.email!.toLowerCase());
  const suppressedSet = new Set<string>();
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500);
    const { data: suppressions } = await supabase.from("suppressions").select("email").in("email", chunk);
    for (const s of suppressions ?? []) suppressedSet.add((s.email as string).toLowerCase());
  }
  const eligible = consented.filter((c) => {
    if (suppressedSet.has(c.email!.toLowerCase())) {
      bump("suppressed (unsubscribed/bounced)");
      return false;
    }
    return true;
  });

  return {
    eligible: eligible.map((c) => ({
      contact_id: c.id,
      email: c.email!,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed",
    })),
    excluded: Object.entries(excluded).map(([reason, count]) => ({ reason, count })),
    total_matched: total,
  };
}
