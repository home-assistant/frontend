import { describe, it, expect } from "vitest";
import Fuse from "fuse.js";
import {
  multiTermSortedSearch,
  normalizingGetFn,
  type FuseWeightedKey,
} from "../../src/resources/fuseMultiTerm";

interface TestItem {
  id: string;
  primary: string;
  secondary?: string;
}

const SEARCH_KEYS: FuseWeightedKey[] = [
  { name: "primary", weight: 10 },
  { name: "secondary", weight: 5 },
  { name: "id", weight: 3 },
];

const ITEMS: TestItem[] = [
  { id: "light.lazienka", primary: "Łazienka światło" },
  { id: "light.salon", primary: "Pokój dzienny" },
  { id: "light.kuchnia", primary: "Kuchnia", secondary: "Główne oświetlenie" },
  { id: "sensor.temp", primary: "Czujnik temperatury" },
  { id: "light.corridor", primary: "Korytarz", secondary: "Østveien gate" },
];

const createIndex = (items: TestItem[]) =>
  Fuse.createIndex(SEARCH_KEYS, items, { getFn: normalizingGetFn });

describe("multiTermSortedSearch with diacritics", () => {
  it("should match 'lazienka' against 'Łazienka'", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "lazienka",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.lazienka");
  });

  it("should match 'łazienka' against 'Łazienka'", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "łazienka",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.lazienka");
  });

  it("should match 'swiatlo' against 'światło'", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "swiatlo",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.lazienka");
  });

  it("should match 'pokoj' against 'Pokój'", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "pokoj",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.salon");
  });

  it("should match multi-term 'lazienka swiatlo' against 'Łazienka światło'", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "lazienka swiatlo",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.lazienka");
  });

  it("should match Danish ø in secondary field", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "ostveien",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.corridor");
  });

  it("should match 'glowne' against 'Główne' (ł in secondary)", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "glowne",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results.map((r) => r.id)).toContain("light.kuchnia");
  });

  it("should return all items when search is empty", () => {
    const index = createIndex(ITEMS);
    const results = multiTermSortedSearch(
      ITEMS,
      "",
      SEARCH_KEYS,
      (item) => item.id,
      index
    );
    expect(results).toHaveLength(ITEMS.length);
  });
});
