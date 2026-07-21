import { contactName } from "@/lib/contact-helpers";
import type { LinkColumn, LinkType } from "./link-search";

/** Embed fragment for a task's associations, for use inside a tasks select. */
export const TASK_LINKS_SELECT =
  "task_links(contact_id, practice_id, deal_id, contacts(first_name, last_name, company_name, roles), practices(display_title), deals(ref))";

export type TaskLinkView = { type: LinkType; column: LinkColumn; id: string; title: string; href: string };

type LinkRow = {
  contact_id: string | null;
  practice_id: string | null;
  deal_id: string | null;
  contacts: unknown;
  practices: unknown;
  deals: unknown;
};

function contactType(roles: string[]): LinkType {
  if (roles.includes("seller")) return "seller";
  if (roles.includes("solicitor")) return "solicitor";
  return "buyer";
}

/** Turn embedded task_links rows into typed link views for display/editing. */
export function buildTaskLinks(rows: unknown): TaskLinkView[] {
  const arr = (rows as LinkRow[] | null) ?? [];
  const out: TaskLinkView[] = [];
  for (const r of arr) {
    if (r.contact_id) {
      const c = r.contacts as { first_name: string | null; last_name: string | null; company_name: string | null; roles: string[] | null } | null;
      out.push({
        type: contactType(c?.roles ?? []),
        column: "contact_id",
        id: r.contact_id,
        title: (c ? contactName(c) : null) || "Contact",
        href: `/contacts/${r.contact_id}`,
      });
    } else if (r.practice_id) {
      const p = r.practices as { display_title: string } | null;
      out.push({ type: "practice", column: "practice_id", id: r.practice_id, title: p?.display_title ?? "Practice", href: `/practices/${r.practice_id}` });
    } else if (r.deal_id) {
      const d = r.deals as { ref: string } | null;
      out.push({ type: "deal", column: "deal_id", id: r.deal_id, title: d?.ref ?? "Deal", href: `/deals/${r.deal_id}` });
    }
  }
  return out;
}
