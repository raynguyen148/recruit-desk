import { describe, expect, it } from "vitest";
import { monthlyMin, parseSalary } from "../src/lib/salary";

describe("parseSalary", () => {
  it("reads currency, amount and period", () => {
    expect(parseSalary("USD 4,500 / month")).toEqual({
      min: 4500,
      max: 4500,
      currency: "USD",
      period: "month",
    });
  });
  it("reads ranges with k and symbols", () => {
    expect(parseSalary("$3k - 4k")).toMatchObject({
      min: 3000,
      max: 4000,
      currency: "USD",
    });
  });
  it("reads Vietnamese million shorthand", () => {
    expect(parseSalary("20-30tr")).toMatchObject({
      min: 20_000_000,
      max: 30_000_000,
      currency: "VND",
    });
  });
  it("normalises yearly pay to a month", () => {
    expect(monthlyMin("60000 USD / year")).toBe(5000);
  });
  it("returns null without an amount", () => {
    expect(parseSalary("negotiable")).toBeNull();
    expect(monthlyMin("")).toBeNull();
  });
});
