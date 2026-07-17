import { describe, expect, it } from "vitest";
import {
  buildContactContext,
  buildPracticeMarketingContext,
  extractTags,
  renderMergeTags,
  unresolvedTags,
} from "./index";

describe("renderMergeTags", () => {
  it("substitutes nested paths", () => {
    expect(renderMergeTags("Hello {{contact.first_name}}", { contact: { first_name: "Sarah" } })).toBe(
      "Hello Sarah",
    );
  });

  it("uses the fallback when the value is missing or empty", () => {
    expect(renderMergeTags("Hello {{contact.first_name|there}}", { contact: { first_name: "" } })).toBe(
      "Hello there",
    );
    expect(renderMergeTags("Hello {{contact.first_name|there}}", {})).toBe("Hello there");
  });

  it("renders empty for missing values without fallback", () => {
    expect(renderMergeTags("Hello {{contact.first_name}}!", {})).toBe("Hello !");
  });

  it("handles multiple tags and whitespace", () => {
    expect(
      renderMergeTags("{{ a }} and {{b|two}}", { a: "one" }),
    ).toBe("one and two");
  });

  it("leaves non-tag braces alone", () => {
    expect(renderMergeTags("keep {this} as-is", {})).toBe("keep {this} as-is");
  });
});

describe("extractTags / unresolvedTags", () => {
  it("lists unique tags", () => {
    expect(extractTags("{{a}} {{b|x}} {{a}}")).toEqual(["a", "b"]);
  });
  it("reports only fallback-less missing tags", () => {
    expect(unresolvedTags("{{a}} {{b|x}} {{c}}", { a: 1 })).toEqual(["c"]);
  });
});

describe("context builders", () => {
  it("builds salutation falling back to first name", () => {
    const ctx = buildContactContext({ first_name: "Raj", last_name: "Patel", salutation: null });
    expect((ctx.contact as { salutation: string }).salutation).toBe("Raj");
  });

  it("marketing practice context excludes identifying fields", () => {
    const ctx = buildPracticeMarketingContext({
      display_title: "4-surgery mixed practice, Cheshire",
      town: "Chester",
      county: "Cheshire",
      asking_price: 750000,
      price_prefix: "offers_over",
      surgeries: 4,
      name: "SECRET Dental Ltd",
      address_line1: "1 Secret Street",
      postcode: "CH1 1AA",
      confidential: true,
    });
    const flat = JSON.stringify(ctx);
    expect(flat).not.toContain("SECRET Dental");
    expect(flat).not.toContain("Secret Street");
    expect(flat).not.toContain("CH1 1AA");
    expect((ctx.practice as { price_label: string }).price_label).toBe("Offers over £750,000");
  });

  it("POA practices render a POA price label", () => {
    const ctx = buildPracticeMarketingContext({
      display_title: "t",
      town: null,
      county: null,
      asking_price: null,
      surgeries: null,
    });
    expect((ctx.practice as { price_label: string }).price_label).toBe("Price on application");
  });
});
