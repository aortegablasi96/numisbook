import { describe, it, expect } from "vitest";
import { parseAcceptLanguage, resolveLocale } from "./resolve";

describe("parseAcceptLanguage", () => {
  it("returns [] for a missing/empty header", () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });

  it("orders by q-value and strips region subtags", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toEqual([
      "en",
      "en",
      "es",
    ]);
  });

  it("treats a tag with no q as q=1 (highest)", () => {
    expect(parseAcceptLanguage("de;q=0.5,fr")).toEqual(["fr", "de"]);
  });
});

describe("resolveLocale", () => {
  it("prefers a supported user preference above all else", () => {
    expect(
      resolveLocale({
        userLocale: "de",
        cookieLocale: "fr",
        acceptLanguage: "es",
      }),
    ).toBe("de");
  });

  it("falls back to the cookie when the user has no (valid) preference", () => {
    expect(
      resolveLocale({ userLocale: null, cookieLocale: "it", acceptLanguage: "es" }),
    ).toBe("it");
    expect(
      resolveLocale({ userLocale: "xx", cookieLocale: "it" }),
    ).toBe("it");
  });

  it("falls back to Accept-Language when no preference or cookie", () => {
    expect(
      resolveLocale({ acceptLanguage: "pt,ru;q=0.9,en;q=0.5" }),
    ).toBe("ru");
  });

  it("ignores unsupported candidates and defaults to English", () => {
    expect(
      resolveLocale({
        userLocale: "xx",
        cookieLocale: "zz",
        acceptLanguage: "pt-BR,ja",
      }),
    ).toBe("en");
    expect(resolveLocale({})).toBe("en");
  });
});
