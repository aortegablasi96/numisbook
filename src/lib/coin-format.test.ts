import { describe, it, expect } from "vitest";
import {
  formatYear,
  formatYearRange,
  formatCoinTitle,
  formatCoinCharacteristics,
} from "./coin-format";

describe("formatYear / formatYearRange", () => {
  it("renders BC for negative years", () => {
    expect(formatYear(-44)).toBe("44 BC");
    expect(formatYear(14)).toBe("14");
  });

  it("collapses equal bounds and renders open ranges", () => {
    expect(formatYearRange(-27, 14)).toBe("27 BC – 14");
    expect(formatYearRange(50, 50)).toBe("50");
    expect(formatYearRange(null, 100)).toBe("100");
    expect(formatYearRange(null, null)).toBeNull();
  });
});

describe("formatCoinTitle", () => {
  it("composes category, authority, year range and mint", () => {
    expect(
      formatCoinTitle({
        category: "Romans",
        issuingAuthority: "Augustus",
        yearFrom: -27,
        yearTo: 14,
        mint: "Rome",
      }),
    ).toBe("Romans. Augustus (27 BC – 14), Rome");
  });

  it("drops missing pieces and their separators", () => {
    expect(formatCoinTitle({ category: "Romans" })).toBe("Romans");
    expect(formatCoinTitle({ issuingAuthority: "Athens", mint: "Attica" })).toBe(
      "Athens, Attica",
    );
    expect(formatCoinTitle({ yearFrom: -100, yearTo: -100 })).toBe("100 BC");
  });

  it("falls back to a label when nothing is known", () => {
    expect(formatCoinTitle({})).toBe("Untitled coin");
  });
});

describe("formatCoinCharacteristics", () => {
  it("wraps specs in parentheses after the denomination", () => {
    expect(
      formatCoinCharacteristics({
        denomination: "Denarius",
        metal: "Silver",
        diameter: "19.00",
        weight: "3.85",
      }),
    ).toBe("Denarius (Silver, 19.00 mm, 3.85 g)");
  });

  it("omits empty parentheses and missing parts", () => {
    expect(formatCoinCharacteristics({ denomination: "Denarius" })).toBe("Denarius");
    expect(formatCoinCharacteristics({ metal: "Bronze", weight: "5.00" })).toBe(
      "Bronze, 5.00 g",
    );
    expect(formatCoinCharacteristics({})).toBeNull();
  });
});
