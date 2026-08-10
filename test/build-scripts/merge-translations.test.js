/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import {
  mergeTranslations,
  restrictedMerge,
} from "../../build-scripts/gulp/merge-translations.js";

describe("restrictedMerge", () => {
  it("overrides base values with overlay values", () => {
    expect(restrictedMerge({ a: "en", b: "en" }, { a: "de" })).toEqual({
      a: "de",
      b: "en",
    });
  });

  it("drops overlay keys that are absent from the base", () => {
    // `removed` was deleted from en.json but still lingers in Lokalise.
    expect(
      restrictedMerge({ kept: "en" }, { kept: "de", removed: "de" })
    ).toEqual({ kept: "de" });
  });

  it("recurses into nested objects and prunes there too", () => {
    const base = { ui: { greeting: "hi", panel: { config: "config" } } };
    const overlay = {
      ui: {
        greeting: "hallo",
        removed: "weg",
        panel: { config: "konfig", gone: "weg" },
      },
    };
    expect(restrictedMerge(base, overlay)).toEqual({
      ui: { greeting: "hallo", panel: { config: "konfig" } },
    });
  });

  it("keeps the base value when the overlay shape does not match", () => {
    expect(
      restrictedMerge({ a: { nested: "en" } }, { a: "not an object" })
    ).toEqual({ a: { nested: "en" } });
  });
});

describe("mergeTranslations", () => {
  it("prunes to the English master shape when pruning is enabled", () => {
    const en = { a: "en", nested: { b: "en" } };
    const de = { a: "de", nested: { b: "de", removed: "de" }, removed: "de" };
    expect(mergeTranslations(en, [de], true)).toEqual({
      a: "de",
      nested: { b: "de" },
    });
  });

  it("falls back to English for keys the overlay does not translate", () => {
    const en = { a: "en", b: "en" };
    const de = { a: "de" };
    expect(mergeTranslations(en, [de], true)).toEqual({ a: "de", b: "en" });
  });

  it("applies overlays in order, later overlays winning", () => {
    // Mirrors base-language + region subtag merging (de then de-CH).
    const en = { a: "en", b: "en", c: "en" };
    const de = { a: "de", b: "de" };
    const deCH = { a: "de-CH" };
    expect(mergeTranslations(en, [de, deCH], true)).toEqual({
      a: "de-CH",
      b: "de",
      c: "en",
    });
  });

  it("merges additively when pruning is disabled", () => {
    const en = { a: "en" };
    const extra = { a: "override", added: "added" };
    expect(mergeTranslations(en, [extra], false)).toEqual({
      a: "override",
      added: "added",
    });
  });
});
