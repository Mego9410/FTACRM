// Merge fields available to document templates. Rendered with lib/merge-tags
// ({{group.key}}). The Control Centre editor shows this list; the generator
// resolves each from the record (some auto, some confirmed by the user).

export type DocMergeField = {
  key: string;
  label: string;
  example: string;
  group: string;
  /** true = pre-filled from the record but editable at generation; false = auto only. */
  input?: boolean;
};

export const DOCUMENT_MERGE_FIELDS: DocMergeField[] = [
  { key: "date.today", label: "Date issued", example: "23 July 2026", group: "General" },
  { key: "agent.name", label: "FTA agent (first name)", example: "Andy", group: "General", input: true },
  { key: "practice.name", label: "Practice name", example: "Hampstead Dental Studio", group: "Practice" },
  { key: "practice.legal_name", label: "Legal / trading entity", example: "Hampstead Dental Studio Limited", group: "Practice", input: true },
  { key: "practice.address", label: "Full address (multi-line)", example: "9 The Market Place…", group: "Practice" },
  { key: "practice.town", label: "Town", example: "London", group: "Practice" },
  { key: "practice.postcode", label: "Postcode", example: "NW11 6LB", group: "Practice" },
  { key: "fee.percent", label: "Commission %", example: "3", group: "Fees", input: true },
  { key: "fee.minimum", label: "Minimum fee", example: "£12,000", group: "Fees", input: true },
  { key: "seller.name", label: "Seller name", example: "Dr Khilan Shah", group: "Seller" },
  { key: "seller.title", label: "Seller title", example: "Dr", group: "Seller" },
  { key: "signature", label: "Signature (added when signed)", example: "—", group: "Signature" },
];

/** Turn a flat map of dotted keys ({"practice.name": …}) into the nested object
 * lib/merge-tags expects ({ practice: { name: … } }). */
export function nestContext(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [dotted, value] of Object.entries(flat)) {
    const parts = dotted.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const k = parts[i]!;
      node[k] = (node[k] as Record<string, unknown>) ?? {};
      node = node[k] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]!] = value;
  }
  return out;
}
