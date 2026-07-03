import { describe, it, expect } from "vitest";
import { interpolate, t } from "./t";
import { getMessages } from "./messages";
import { en } from "./messages/en";

describe("interpolate", () => {
  it("returns the template unchanged with no params", () => {
    expect(interpolate("Hello world")).toBe("Hello world");
  });

  it("substitutes named placeholders", () => {
    expect(interpolate("Hi {name}, you have {n} coins", { name: "Ada", n: 3 })).toBe(
      "Hi Ada, you have 3 coins",
    );
  });

  it("leaves unknown placeholders intact", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});

describe("getMessages", () => {
  it("returns the English catalog for en", () => {
    expect(getMessages("en")["app.name"]).toBe("NumisBook");
  });

  it("falls back to English for a locale with no override yet", () => {
    // Spanish catalog is empty until story #125; every key resolves to English.
    expect(getMessages("es")).toEqual(en);
  });
});

describe("t", () => {
  it("translates a key for a locale", () => {
    expect(t("en", "nav.settings")).toBe("Settings");
  });

  it("interpolates params", () => {
    expect(interpolate(t("en", "app.name"))).toBe("NumisBook");
  });
});
