import { describe, it, expect } from "vitest";
import { extractGroundedNumbers, validateNumericGrounding } from "../numeric-validator";

describe("extractGroundedNumbers", () => {
  it("collects numbers from nested objects and arrays, ignoring strings/booleans", () => {
    const payload = {
      revenue: 125542,
      meta: { deltaPct: 5.8, label: "up" },
      topProducts: [
        { name: "Rice", revenue: 25920 },
        { name: "Atta", revenue: 15340 },
      ],
      active: true,
    };
    const numbers = extractGroundedNumbers(payload);
    expect(numbers).toEqual(new Set([125542, 5.8, 25920, 15340]));
  });
});

describe("validateNumericGrounding", () => {
  const grounded = extractGroundedNumbers({ revenue: 125542, deltaPct: 5.8, count: 4 });

  it("passes when every cited figure matches a grounded number exactly", () => {
    expect(
      validateNumericGrounding(
        [
          { label: "Revenue", value: 125542 },
          { label: "Growth", value: 5.8 },
        ],
        grounded
      )
    ).toBe(true);
  });

  it("tolerates small rounding drift", () => {
    expect(validateNumericGrounding([{ label: "Revenue", value: 125542.3 }], grounded)).toBe(true);
  });

  it("rejects a fabricated number not present anywhere in the payload", () => {
    expect(validateNumericGrounding([{ label: "Made up", value: 999999 }], grounded)).toBe(false);
  });

  it("rejects if even one of several cited figures is ungrounded", () => {
    expect(
      validateNumericGrounding(
        [
          { label: "Revenue", value: 125542 },
          { label: "Invented", value: 42 },
        ],
        grounded
      )
    ).toBe(false);
  });

  it("passes trivially when there are no cited figures to check", () => {
    expect(validateNumericGrounding([], grounded)).toBe(true);
  });

  it("rejects a derived/computed number even if numerically close to a coincidence", () => {
    // 125542 + 5.8 = 125547.8 — a plausible-looking "sum" that was never in the payload.
    expect(validateNumericGrounding([{ label: "Total?", value: 125547.8 }], grounded)).toBe(false);
  });
});
