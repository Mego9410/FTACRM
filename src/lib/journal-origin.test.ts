import { describe, expect, it } from "vitest";
import { originKindForRoles, resolveOrigin, type EntryOrigin, type OriginMaps } from "./journal-origin";

const practiceOrigin: EntryOrigin = { kind: "Practice", label: "Elm Dental", href: "/practices/P/journal" };
const buyerOrigin: EntryOrigin = { kind: "Buyer", label: "Dr Patel", href: "/contacts/B/journal" };
const dealOrigin: EntryOrigin = { kind: "Deal", label: "D-2026-0001", href: "/deals/D/journal" };

function maps(primary: OriginMaps["primary"]): OriginMaps {
  return {
    primary,
    practices: new Map([["P", practiceOrigin]]),
    contacts: new Map([["B", buyerOrigin]]),
    deals: new Map([["D", dealOrigin]]),
  };
}

describe("originKindForRoles", () => {
  it("prefers seller, then buyer, then solicitor", () => {
    expect(originKindForRoles(["seller", "buyer"])).toBe("Seller");
    expect(originKindForRoles(["buyer"])).toBe("Buyer");
    expect(originKindForRoles(["buyer_solicitor"])).toBe("Solicitor");
    expect(originKindForRoles(["accountant"])).toBe("Contact");
    expect(originKindForRoles([])).toBe("Contact");
  });
});

describe("resolveOrigin", () => {
  it("returns null for an entry native to the practice being viewed", () => {
    const e = { contact_id: null, practice_id: "P", deal_id: null };
    expect(resolveOrigin(e, maps({ practiceId: "P" }))).toBeNull();
  });

  it("attributes a linked buyer's note when viewing the practice", () => {
    const e = { contact_id: "B", practice_id: null, deal_id: null };
    expect(resolveOrigin(e, maps({ practiceId: "P" }))).toEqual(buyerOrigin);
  });

  it("attributes a practice note when viewing a linked buyer", () => {
    const e = { contact_id: null, practice_id: "P", deal_id: null };
    expect(resolveOrigin(e, maps({ contactId: "B" }))).toEqual(practiceOrigin);
  });

  it("treats the buyer's own note as native when viewing the buyer", () => {
    const e = { contact_id: "B", practice_id: null, deal_id: null };
    expect(resolveOrigin(e, maps({ contactId: "B" }))).toBeNull();
  });

  it("prefers a practice attribution over a deal on a completion note", () => {
    // systemJournal completion writes { deal_id, practice_id } together.
    const e = { contact_id: null, practice_id: "P", deal_id: "D" };
    expect(resolveOrigin(e, maps({ contactId: "B" }))).toEqual(practiceOrigin);
  });

  it("returns null when the entry links to an unknown record", () => {
    const e = { contact_id: "Z", practice_id: null, deal_id: null };
    expect(resolveOrigin(e, maps({ practiceId: "P" }))).toBeNull();
  });
});
