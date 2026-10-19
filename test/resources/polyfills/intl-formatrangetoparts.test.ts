import { afterAll, beforeAll, describe, expect, it } from "vitest";

const proto = Intl.DateTimeFormat.prototype;
const native = proto.formatRangeToParts;
const nativeDescriptors = Object.getOwnPropertyDescriptors(proto);

const text = (parts: Intl.DateTimeFormatPart[]) =>
  parts
    .map((part) => part.value)
    .join("")
    .replace(/\s+/g, " ");

const format = (
  options: Intl.DateTimeFormatOptions,
  start: string,
  end: string,
  locale = "en-US"
) => {
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  });
  const range: [Date, Date] = [new Date(start), new Date(end)];
  return {
    polyfill: formatter.formatRangeToParts(...range),
    native: native.call(formatter, ...range),
  };
};

describe("Intl.DateTimeFormat formatRangeToParts polyfill", () => {
  beforeAll(async () => {
    delete (proto as any).formatRangeToParts;
    delete (proto as any).formatRange;
    await import("../../../src/resources/polyfills/intl-formatrangetoparts");
  });

  afterAll(() => {
    Object.defineProperties(proto, {
      formatRange: nativeDescriptors.formatRange,
      formatRangeToParts: nativeDescriptors.formatRangeToParts,
    });
  });

  it.each([
    ["month", { year: "numeric", month: "long" }, "2026-03-01", "2026-03-31"],
    [
      "week",
      { year: "numeric", month: "short", day: "numeric" },
      "2026-03-08",
      "2026-03-14",
    ],
    [
      "week across months",
      { year: "numeric", month: "short", day: "numeric" },
      "2026-03-29",
      "2026-04-04",
    ],
    [
      "week across years",
      { year: "numeric", month: "short", day: "numeric" },
      "2026-12-28",
      "2027-01-03",
    ],
    [
      "time",
      { hour: "numeric", minute: "2-digit" },
      "2026-03-10T10:00Z",
      "2026-03-10T11:30Z",
    ],
    [
      "time across days",
      { hour: "numeric", minute: "2-digit" },
      "2026-03-10T09:00Z",
      "2026-03-11T10:00Z",
    ],
    [
      "full day",
      { hour: "numeric", minute: "2-digit" },
      "2026-03-10T00:00Z",
      "2026-03-11T00:00Z",
    ],
    [
      "numeric week",
      { year: "numeric", month: "numeric", day: "numeric" },
      "2026-03-08",
      "2026-03-14",
    ],
    [
      "numeric same day across months",
      { year: "numeric", month: "numeric", day: "numeric" },
      "2026-03-10",
      "2026-04-10",
    ],
    [
      "same day across months",
      { year: "numeric", month: "long", day: "numeric" },
      "2026-03-10",
      "2026-04-10",
      "en-GB",
    ],
    [
      "date with time",
      { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
      "2026-03-10T10:00Z",
      "2026-03-10T11:30Z",
    ],
    [
      "date with time across days",
      { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
      "2026-03-10T10:00Z",
      "2026-03-11T10:00Z",
    ],
  ] as const)(
    "matches ICU for a %s range",
    (_name, options, start, end, locale?: string) => {
      const result = format(options, start, end, locale);
      expect(text(result.polyfill)).toBe(text(result.native));
    }
  );

  it("keeps the ordinal dot of a German start day", () => {
    const { polyfill } = format(
      { year: "numeric", month: "short", day: "numeric" },
      "2026-03-08",
      "2026-03-14",
      "de"
    );
    // ICU gives "8.–14. März 2026"
    expect(text(polyfill)).toMatch(/^8\.( März)? – 14\. März 2026$/);
  });

  it("returns a new separator for every range", () => {
    const { polyfill: first } = format(
      { hour: "numeric", minute: "2-digit" },
      "2026-03-10T10:00Z",
      "2026-03-10T11:30Z"
    );
    // FullCalendar trims the literal before a day period in place
    for (const part of first) {
      part.value = part.value.trimEnd();
    }
    const { polyfill } = format(
      { year: "numeric", month: "short", day: "numeric" },
      "2026-03-29",
      "2026-04-04"
    );
    expect(text(polyfill)).toBe("Mar 29 – Apr 4, 2026");
  });

  it("shows both dates for a time range across days in German", () => {
    const { polyfill } = format(
      { hour: "numeric", minute: "2-digit" },
      "2026-03-10T00:00Z",
      "2026-03-11T00:00Z",
      "de"
    );
    expect(text(polyfill)).toMatch(/^10\.3\.2026, .+ – 11\.3\.2026, .+$/);
  });

  it("tags the parts of each end", () => {
    const { polyfill } = format(
      { year: "numeric", month: "short", day: "numeric" },
      "2026-03-29",
      "2026-04-04"
    );
    const months = polyfill.filter((part) => part.type === "month");
    expect(months.map((part) => part.source)).toEqual([
      "startRange",
      "endRange",
    ]);
    expect(polyfill.find((part) => part.value === " – ")?.source).toBe(
      "shared"
    );
  });

  it("shares every part when both ends format the same", () => {
    const { polyfill } = format(
      { year: "numeric", month: "long" },
      "2026-03-01",
      "2026-03-31"
    );
    expect(polyfill.every((part) => part.source === "shared")).toBe(true);
  });

  it("leaves formatRange alone so the FormatJS polyfill still loads", () => {
    expect("formatRange" in proto).toBe(false);
  });
});
