import { describe, expect, it } from "vitest";
import { daysLabel, holidayDays } from "./holiday-utils";

// Reference weekdays (UTC): Fri 2026-08-14, Sat 15, Sun 16, Mon 17 … Fri 21.
describe("holidayDays", () => {
  it("counts a single full weekday as one", () => {
    expect(holidayDays("2026-08-17", "2026-08-17")).toBe(1);
  });

  it("counts a single half weekday as a half", () => {
    expect(holidayDays("2026-08-17", "2026-08-17", "am", "am")).toBe(0.5);
    expect(holidayDays("2026-08-17", "2026-08-17", "pm", "pm")).toBe(0.5);
  });

  it("ignores weekends", () => {
    expect(holidayDays("2026-08-15", "2026-08-15")).toBe(0); // Saturday
    expect(holidayDays("2026-08-14", "2026-08-17")).toBe(2); // Fri + Mon, Sat/Sun skipped
  });

  it("counts a full working week", () => {
    expect(holidayDays("2026-08-17", "2026-08-21")).toBe(5);
  });

  it("subtracts halves on the first and last day", () => {
    expect(holidayDays("2026-08-17", "2026-08-21", "pm", "full")).toBe(4.5);
    expect(holidayDays("2026-08-17", "2026-08-21", "full", "am")).toBe(4.5);
    expect(holidayDays("2026-08-17", "2026-08-21", "pm", "am")).toBe(4);
  });

  it("handles half boundaries that fall either side of a weekend", () => {
    expect(holidayDays("2026-08-14", "2026-08-17", "pm", "am")).toBe(1); // half Fri + half Mon
  });
});

describe("daysLabel", () => {
  it("pluralises correctly", () => {
    expect(daysLabel(1)).toBe("1 working day");
    expect(daysLabel(0.5)).toBe("0.5 working days");
    expect(daysLabel(5)).toBe("5 working days");
  });
});
