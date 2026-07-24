import { describe, expect, it } from "vitest";
import { monthBounds } from "./monthly-figures-utils";

describe("monthBounds", () => {
  it("spans a whole month, exclusive end", () => {
    expect(monthBounds("2026-07")).toMatchObject({ fromDate: "2026-07-01", toDate: "2026-08-01" });
  });

  it("rolls over the year in December", () => {
    expect(monthBounds("2026-12")).toMatchObject({ fromDate: "2026-12-01", toDate: "2027-01-01" });
  });

  it("labels the month in en-GB", () => {
    expect(monthBounds("2026-07").label).toBe("July 2026");
  });
});
