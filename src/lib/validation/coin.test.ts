import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { parseCoinSearchParams } from "./coin";

const parse = (query: string) => parseCoinSearchParams(new URLSearchParams(query));

describe("parseCoinSearchParams", () => {
  it("defaults to an unfiltered first page", () => {
    expect(parse("")).toEqual({
      q: undefined,
      metals: [],
      categories: [],
      denominations: [],
      mints: [],
      grades: [],
      yearFrom: undefined,
      yearTo: undefined,
      page: 1,
      sortBy: undefined,
      sortDir: undefined,
    });
  });

  it("reads repeated params as multi-value filters", () => {
    const search = parse("metal=Silver&metal=Gold&grade=VF&grade=MS");
    expect(search.metals).toEqual(["Silver", "Gold"]);
    expect(search.grades).toEqual(["VF", "MS"]);
  });

  it("drops blank values so `?metal=` means no metal filter", () => {
    const search = parse("metal=&metal=Silver&q=%20%20");
    expect(search.metals).toEqual(["Silver"]);
    expect(search.q).toBeUndefined();
  });

  it("coerces the year range and accepts negative (BC) years", () => {
    const search = parse("yearFrom=-400&yearTo=-300");
    expect(search.yearFrom).toBe(-400);
    expect(search.yearTo).toBe(-300);
  });

  it("accepts an open-ended year range", () => {
    expect(parse("yearFrom=-44").yearTo).toBeUndefined();
    expect(parse("yearTo=100").yearFrom).toBeUndefined();
  });

  it("accepts a range spanning BC into AD", () => {
    const search = parse("yearFrom=-50&yearTo=50");
    expect([search.yearFrom, search.yearTo]).toEqual([-50, 50]);
  });

  it("rejects an inverted year range", () => {
    expect(() => parse("yearFrom=100&yearTo=50")).toThrow(ZodError);
  });

  it("rejects an unknown grade, sort field, or sort direction", () => {
    expect(() => parse("grade=XF")).toThrow(ZodError);
    expect(() => parse("sortBy=hammerPrice")).toThrow(ZodError);
    expect(() => parse("sortDir=sideways")).toThrow(ZodError);
  });

  it("rejects a non-numeric or non-positive page", () => {
    expect(() => parse("page=abc")).toThrow(ZodError);
    expect(() => parse("page=0")).toThrow(ZodError);
  });

  it("caps a hand-crafted filter list so it cannot become an unbounded OR", () => {
    const many = Array.from({ length: 51 }, (_, i) => `mint=m${i}`).join("&");
    expect(() => parse(many)).toThrow(ZodError);
  });
});
