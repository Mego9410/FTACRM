export type ContactNameFields = {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
};

export function contactName(c: ContactNameFields): string {
  const person = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return person || c.company_name || "Unnamed contact";
}

export const ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  solicitor: "Solicitor",
  other: "Other",
};

export const PRACTICE_ROLE_LABELS: Record<string, string> = {
  seller: "Seller",
  buyer: "Buyer",
  seller_solicitor: "Seller's solicitor",
  buyer_solicitor: "Buyer's solicitor",
  accountant: "Accountant",
  other: "Other",
};

export const PRACTICE_STATUS_LABELS: Record<string, string> = {
  valuation: "Valuation",
  preparing: "Preparing",
  available: "Available",
  under_offer: "Under offer",
  sold_stc: "Sold STC",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

export const PRACTICE_STATUS_TONES: Record<
  string,
  "neutral" | "gold" | "green" | "danger" | "warn" | "ink" | "nhs"
> = {
  valuation: "nhs",
  preparing: "neutral",
  available: "green",
  under_offer: "gold",
  sold_stc: "gold",
  completed: "ink",
  withdrawn: "danger",
};
