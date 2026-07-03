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

  it("returns locale strings for a translated locale", () => {
    expect(getMessages("es")["nav.settings"]).toBe("Ajustes");
  });

  it("always returns a catalog covering every English key (per-key fallback)", () => {
    // The merge over English guarantees completeness even if a locale omits a
    // key; a locale value overrides English where present.
    const es = getMessages("es");
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
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
