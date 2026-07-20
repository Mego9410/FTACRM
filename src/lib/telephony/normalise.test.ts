import { describe, expect, it } from "vitest";
import { isInternalExtension, normalisePhone, samePhone } from "./normalise";

describe("normalisePhone", () => {
  it("normalises UK mobiles with leading 0", () => {
    expect(normalisePhone("07911 123456")).toBe("+447911123456");
    expect(normalisePhone("07911-123-456")).toBe("+447911123456");
  });
  it("normalises London landlines", () => {
    expect(normalisePhone("020 7946 0018")).toBe("+442079460018");
  });
  it("normalises +44 forms including the (0)", () => {
    expect(normalisePhone("+44 7911 123456")).toBe("+447911123456");
    expect(normalisePhone("+44 (0)20 7946 0018")).toBe("+442079460018");
    expect(normalisePhone("+4407911123456")).toBe("+447911123456");
  });
  it("normalises 0044 and bare 44 forms", () => {
    expect(normalisePhone("0044 20 7946 0018")).toBe("+442079460018");
    expect(normalisePhone("447911123456")).toBe("+447911123456");
    expect(normalisePhone("4407911123456")).toBe("+447911123456");
  });
  it("treats bare national significant numbers as UK", () => {
    expect(normalisePhone("7911123456")).toBe("+447911123456");
  });
  it("passes non-UK international through", () => {
    expect(normalisePhone("+1 415 555 0100")).toBe("+14155550100");
    expect(normalisePhone("0033 1 42 68 53 00")).toBe("+33142685300");
  });
  it("rejects junk and empties", () => {
    expect(normalisePhone("")).toBeNull();
    expect(normalisePhone(null)).toBeNull();
    expect(normalisePhone("101")).toBeNull();
    expect(normalisePhone("ext. 12")).toBeNull();
  });
});

describe("samePhone", () => {
  it("matches equivalent representations", () => {
    expect(samePhone("07911 123456", "+447911123456")).toBe(true);
    expect(samePhone("020 7946 0018", "0044 (0)20 7946 0018")).toBe(true);
  });
  it("rejects different numbers and nulls", () => {
    expect(samePhone("07911 123456", "07911 123457")).toBe(false);
    expect(samePhone(null, "07911 123456")).toBe(false);
  });
});

describe("isInternalExtension", () => {
  it("detects short extensions", () => {
    expect(isInternalExtension("101")).toBe(true);
    expect(isInternalExtension("2043")).toBe(true);
  });
  it("rejects full numbers", () => {
    expect(isInternalExtension("07911123456")).toBe(false);
    expect(isInternalExtension("+447911123456")).toBe(false);
  });
});
