import { describe, it, expect } from "vitest";
import { isTheme, resolveTheme } from ".";

describe("isTheme", () => {
  it("accepts the two storable themes", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
  });

  it.each(["system", "", "Light", "sepia", null, undefined, 1])(
    "rejects anything else (%s)",
    (value) => {
      expect(isTheme(value)).toBe(false);
    },
  );
});

describe("resolveTheme", () => {
  it("prefers a valid user preference above the cookie", () => {
    expect(resolveTheme({ userTheme: "dark", cookieTheme: "light" })).toBe("dark");
  });

  it("falls back to the cookie when the user has no (valid) preference", () => {
    expect(resolveTheme({ userTheme: null, cookieTheme: "dark" })).toBe("dark");
    expect(resolveTheme({ userTheme: "sepia", cookieTheme: "light" })).toBe("light");
  });

  it("defaults to 'system' when nothing valid is set", () => {
    expect(resolveTheme({})).toBe("system");
    expect(resolveTheme({ userTheme: "", cookieTheme: "nope" })).toBe("system");
  });
});
