import { describe, it, expect } from "vitest";
import { en } from "./en";
import { es } from "./es";
import { de } from "./de";
import { fr } from "./fr";
import { it as itCatalog } from "./it";
import { zh } from "./zh";
import { ru } from "./ru";
import { LOCALES } from "../locales";
import { getMessages } from "./index";

const englishKeys = Object.keys(en).sort();

// The shell is fully translated in every shipped locale. If English gains a new
// key, this fails until each locale is updated (or intentionally left to fall
// back — in which case add the key here). See ADR-014.
const translated = { es, de, fr, it: itCatalog, zh, ru };

describe("message catalogs", () => {
  it.each(Object.entries(translated))(
    "%s covers every English key",
    (_locale, catalog) => {
      expect(Object.keys(catalog).sort()).toEqual(englishKeys);
    },
  );

  it.each(Object.entries(translated))(
    "%s has no empty strings",
    (_locale, catalog) => {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value, `${key} is empty`).toBeTruthy();
      }
    },
  );

  it.each(Object.entries(translated))(
    "%s preserves the {currency} placeholder in the total-paid stat",
    (_locale, catalog) => {
      expect(catalog["home.stat.totalPaid"]).toContain("{currency}");
    },
  );

  it("resolves a complete catalog for every supported locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(getMessages(locale)).sort()).toEqual(englishKeys);
    }
  });
});
