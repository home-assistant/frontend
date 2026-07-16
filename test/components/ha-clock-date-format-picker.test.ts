import { describe, it, expect } from "vitest";
import { getAvailableClockDatePartSections } from "../../src/components/ha-clock-date-format-picker";

type TestSection = "weekday" | "day" | "month" | "year" | "separator";

const section = (id: TestSection, itemIds: string[]) => ({
  id,
  title: id,
  items: itemIds.map((itemId) => ({ id: itemId, primary: itemId })),
});

const ALL_SECTIONS = [
  section("day", ["day-numeric", "day-2-digit"]),
  section("month", ["month-numeric", "month-short", "month-long"]),
  section("year", ["year-numeric", "year-2-digit"]),
  section("weekday", ["weekday-short", "weekday-long"]),
  section("separator", [
    "separator-dash",
    "separator-slash",
    "separator-dot",
    "separator-new-line",
  ]),
];

describe("getAvailableClockDatePartSections", () => {
  it("returns every section when no value is set", () => {
    const result = getAvailableClockDatePartSections(ALL_SECTIONS, []);
    expect(result.map((sectionData) => sectionData.id)).toEqual([
      "day",
      "month",
      "year",
      "weekday",
      "separator",
    ]);
  });

  it("hides a group's section once a value from that group is used", () => {
    const result = getAvailableClockDatePartSections(ALL_SECTIONS, [
      "day-numeric",
    ]);
    expect(result.map((sectionData) => sectionData.id)).toEqual([
      "month",
      "year",
      "weekday",
      "separator",
    ]);
  });

  it("keeps the edited item's own group visible via excludeIndex", () => {
    const value = ["day-numeric", "month-short"];
    const result = getAvailableClockDatePartSections(ALL_SECTIONS, value, 0);
    expect(result.map((sectionData) => sectionData.id)).toEqual([
      "day",
      "year",
      "weekday",
      "separator",
    ]);
  });

  it("never hides the separator section, even with multiple separators used", () => {
    const value = [
      "separator-dash",
      "separator-slash",
      "separator-dot",
      "separator-new-line",
    ];
    const result = getAvailableClockDatePartSections(ALL_SECTIONS, value);
    expect(result.map((sectionData) => sectionData.id)).toEqual([
      "day",
      "month",
      "year",
      "weekday",
      "separator",
    ]);
  });

  it("treats an unrecognized token as a separator and does not hide any group", () => {
    const result = getAvailableClockDatePartSections(ALL_SECTIONS, [
      "not-a-real-part",
    ]);
    expect(result.map((sectionData) => sectionData.id)).toEqual([
      "day",
      "month",
      "year",
      "weekday",
      "separator",
    ]);
  });
});
