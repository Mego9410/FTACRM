import { describe, expect, it } from "vitest";
import { haversineMiles, matchBuyerToPractice, type MatchBuyer, type MatchPractice } from "./index";
import { regionMatchesCounty } from "./regions";

const basePractice: MatchPractice = {
  id: "p1",
  asking_price: 500_000,
  lat: 53.48,
  lng: -2.24, // Manchester
  county: "Greater Manchester",
  town: "Manchester",
  funding_type_id: "nhs",
  tenure_type_id: "freehold",
  specialism_ids: ["general"],
  surgeries: 4,
  annual_turnover: 900_000,
};

const openBuyer: MatchBuyer = {
  contact_id: "b1",
  min_price: null,
  max_price: null,
  specialism_ids: [],
  funding_type_ids: [],
  tenure_type_ids: [],
  min_surgeries: null,
  min_annual_turnover: null,
  areas: [],
};

describe("haversineMiles", () => {
  it("computes London to Manchester at roughly 163 miles", () => {
    expect(haversineMiles(51.5074, -0.1278, 53.4808, -2.2426)).toBeGreaterThan(155);
    expect(haversineMiles(51.5074, -0.1278, 53.4808, -2.2426)).toBeLessThan(175);
  });
});

describe("matchBuyerToPractice", () => {
  it("matches when the buyer has no constraints", () => {
    const r = matchBuyerToPractice(basePractice, openBuyer);
    expect(r.matches).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(50);
  });

  it("passes price inside the range and scores it as exact", () => {
    const r = matchBuyerToPractice(basePractice, { ...openBuyer, min_price: 400_000, max_price: 600_000 });
    expect(r.matches).toBe(true);
    expect(r.facets).toContain("Price in range");
  });

  it("passes price within the 10% tolerance band, flagged as such", () => {
    const r = matchBuyerToPractice(basePractice, { ...openBuyer, max_price: 460_000 });
    expect(r.matches).toBe(true); // 500k <= 460k * 1.1 = 506k
    expect(r.facets).toContain("Price within 10%");
  });

  it("fails price outside the tolerance band", () => {
    const r = matchBuyerToPractice(basePractice, { ...openBuyer, max_price: 400_000 });
    expect(r.matches).toBe(false);
  });

  it("matches a point+radius area and reports the distance", () => {
    const r = matchBuyerToPractice(basePractice, {
      ...openBuyer,
      areas: [{ lat: 53.48, lng: -2.34, radius_miles: 20, region: null, label: "Salford +20mi" }],
    });
    expect(r.matches).toBe(true);
    expect(r.facets.some((f) => f.startsWith("Area: Salford"))).toBe(true);
  });

  it("fails when outside every area (OR logic across areas)", () => {
    const r = matchBuyerToPractice(basePractice, {
      ...openBuyer,
      areas: [
        { lat: 51.5, lng: -0.12, radius_miles: 10, region: null, label: "London +10mi" },
        { lat: 50.72, lng: -3.52, radius_miles: 15, region: null, label: "Exeter +15mi" },
      ],
    });
    expect(r.matches).toBe(false);
  });

  it("matches via a second area when the first misses", () => {
    const r = matchBuyerToPractice(basePractice, {
      ...openBuyer,
      areas: [
        { lat: 51.5, lng: -0.12, radius_miles: 10, region: null, label: "London +10mi" },
        { lat: 53.48, lng: -2.24, radius_miles: 5, region: null, label: "Manchester +5mi" },
      ],
    });
    expect(r.matches).toBe(true);
  });

  it("matches a region area against the practice county", () => {
    const r = matchBuyerToPractice(basePractice, {
      ...openBuyer,
      areas: [{ lat: null, lng: null, radius_miles: null, region: "North West", label: "North West" }],
    });
    expect(r.matches).toBe(true);
    expect(r.facets).toContain("Area: North West");
  });

  it("skips point areas when the practice has no coordinates", () => {
    const r = matchBuyerToPractice(
      { ...basePractice, lat: null, lng: null },
      {
        ...openBuyer,
        areas: [{ lat: 53.48, lng: -2.24, radius_miles: 20, region: null, label: "Manchester +20mi" }],
      },
    );
    expect(r.matches).toBe(false);
  });

  it("requires funding to be in the buyer's set when specified", () => {
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, funding_type_ids: ["nhs"] }).matches).toBe(true);
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, funding_type_ids: ["private"] }).matches).toBe(false);
  });

  it("fails funding constraint when the practice has no funding set", () => {
    const r = matchBuyerToPractice(
      { ...basePractice, funding_type_id: null },
      { ...openBuyer, funding_type_ids: ["nhs"] },
    );
    expect(r.matches).toBe(false);
  });

  it("requires specialism overlap when specified", () => {
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, specialism_ids: ["general", "ortho"] }).matches).toBe(true);
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, specialism_ids: ["ortho"] }).matches).toBe(false);
  });

  it("enforces minimum surgeries and turnover", () => {
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, min_surgeries: 4 }).matches).toBe(true);
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, min_surgeries: 5 }).matches).toBe(false);
    expect(matchBuyerToPractice(basePractice, { ...openBuyer, min_annual_turnover: 1_000_000 }).matches).toBe(false);
  });

  it("treats unknown turnover as failing a turnover minimum", () => {
    const r = matchBuyerToPractice(
      { ...basePractice, annual_turnover: null },
      { ...openBuyer, min_annual_turnover: 100_000 },
    );
    expect(r.matches).toBe(false);
  });

  it("scores hot buyers above cold ones", () => {
    const hot = matchBuyerToPractice(basePractice, { ...openBuyer, temperature: "hot" });
    const cold = matchBuyerToPractice(basePractice, { ...openBuyer, temperature: "cold" });
    expect(hot.score).toBeGreaterThan(cold.score);
  });

  it("caps score at 100", () => {
    const r = matchBuyerToPractice(basePractice, {
      ...openBuyer,
      min_price: 400_000,
      max_price: 600_000,
      funding_type_ids: ["nhs"],
      tenure_type_ids: ["freehold"],
      specialism_ids: ["general"],
      temperature: "hot",
      last_contacted_at: new Date().toISOString(),
      areas: [{ lat: 53.48, lng: -2.24, radius_miles: 50, region: null, label: "Manchester +50mi" }],
    });
    expect(r.matches).toBe(true);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("regionMatchesCounty", () => {
  it("matches counties inside a region", () => {
    expect(regionMatchesCounty("North West", "Cheshire", null)).toBe(true);
    expect(regionMatchesCounty("North West", "Kent", null)).toBe(false);
  });
  it("falls back to town when county is missing", () => {
    expect(regionMatchesCounty("London", null, "London")).toBe(true);
  });
  it("handles unknown regions and empty locations safely", () => {
    expect(regionMatchesCounty("Narnia", "Cheshire", null)).toBe(false);
    expect(regionMatchesCounty("North West", null, null)).toBe(false);
  });
});
