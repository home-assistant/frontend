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
  ] as const)("matches ICU for a %s title", (_name, options, start, end) => {
    const result = format(options, start, end);
    expect(text(result.polyfill)).toBe(text(result.native));
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
