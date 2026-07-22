import { describe, expect, it } from "vitest";
import { expandRecurrence, type Recurrence } from "./recurrence";

const HOUR = 60 * 60 * 1000;
const iso = (o: { start: Date }) => o.start.toISOString().slice(0, 16);

describe("expandRecurrence", () => {
  it("daily every day within the window", () => {
    const start = new Date("2026-01-01T09:00:00");
    const rule: Recurrence = { freq: "daily", interval: 1, end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-01-05T00:00:00"));
    expect(occ.map(iso)).toEqual([
      "2026-01-01T09:00",
      "2026-01-02T09:00",
      "2026-01-03T09:00",
      "2026-01-04T09:00",
    ]);
  });

  it("daily with an interval of 2 skips days", () => {
    const start = new Date("2026-01-01T09:00:00");
    const rule: Recurrence = { freq: "daily", interval: 2, end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-01-08T00:00:00"));
    expect(occ.map(iso)).toEqual(["2026-01-01T09:00", "2026-01-03T09:00", "2026-01-05T09:00", "2026-01-07T09:00"]);
  });

  it("weekly on chosen weekdays", () => {
    // 2026-01-05 is a Monday. Repeat Mon (1) + Wed (3).
    const start = new Date("2026-01-05T10:00:00");
    const rule: Recurrence = { freq: "weekly", interval: 1, byday: [1, 3], end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-05T00:00:00"), new Date("2026-01-19T00:00:00"));
    expect(occ.map(iso)).toEqual([
      "2026-01-05T10:00", // Mon
      "2026-01-07T10:00", // Wed
      "2026-01-12T10:00", // Mon
      "2026-01-14T10:00", // Wed
    ]);
  });

  it("weekly every 2 weeks", () => {
    const start = new Date("2026-01-05T10:00:00"); // Monday
    const rule: Recurrence = { freq: "weekly", interval: 2, byday: [1], end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-02-01T00:00:00"));
    expect(occ.map(iso)).toEqual(["2026-01-05T10:00", "2026-01-19T10:00"]);
  });

  it("honours an 'after N' end", () => {
    const start = new Date("2026-01-01T09:00:00");
    const rule: Recurrence = { freq: "daily", interval: 1, end: { type: "after", count: 3 } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-02-01T00:00:00"));
    expect(occ.map(iso)).toEqual(["2026-01-01T09:00", "2026-01-02T09:00", "2026-01-03T09:00"]);
  });

  it("honours an 'on' end date (inclusive)", () => {
    const start = new Date("2026-01-01T09:00:00");
    const rule: Recurrence = { freq: "daily", interval: 1, end: { type: "on", date: "2026-01-03" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-02-01T00:00:00"));
    expect(occ.map(iso)).toEqual(["2026-01-01T09:00", "2026-01-02T09:00", "2026-01-03T09:00"]);
  });

  it("monthly on the same day each month", () => {
    const start = new Date("2026-01-15T14:00:00");
    const rule: Recurrence = { freq: "monthly", interval: 1, end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-04-01T00:00:00"));
    expect(occ.map(iso)).toEqual(["2026-01-15T14:00", "2026-02-15T14:00", "2026-03-15T14:00"]);
  });

  it("monthly skips months without the 31st", () => {
    const start = new Date("2026-01-31T08:00:00");
    const rule: Recurrence = { freq: "monthly", interval: 1, end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-01T00:00:00"), new Date("2026-04-15T00:00:00"));
    // Feb has no 31st → skipped; March does.
    expect(occ.map(iso)).toEqual(["2026-01-31T08:00", "2026-03-31T08:00"]);
  });

  it("only returns occurrences overlapping the window", () => {
    const start = new Date("2026-01-01T09:00:00");
    const rule: Recurrence = { freq: "daily", interval: 1, end: { type: "never" } };
    const occ = expandRecurrence(start, HOUR, rule, new Date("2026-01-10T00:00:00"), new Date("2026-01-13T00:00:00"));
    expect(occ.map(iso)).toEqual(["2026-01-10T09:00", "2026-01-11T09:00", "2026-01-12T09:00"]);
  });
});
