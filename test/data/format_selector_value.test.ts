import { describe, it, expect } from "vitest";
import { formatSelectorValue } from "../../src/data/selector/format_selector_value";
import type { HomeAssistant } from "../../src/types";

// formatSelectorValue only touches hass for floor/area/entity/device
// selectors, none of which these tests exercise.
const hass = {} as HomeAssistant;

describe("formatSelectorValue", () => {
  it("returns an empty string for nullish values", () => {
    expect(formatSelectorValue(hass, null)).toBe("");
    expect(formatSelectorValue(hass, undefined)).toBe("");
  });

  it("renders a plain text value", () => {
    expect(formatSelectorValue(hass, "hello", { text: { type: "text" } })).toBe(
      "hello"
    );
  });

  it("applies prefix and suffix for text selectors", () => {
    expect(
      formatSelectorValue(hass, "5", {
        text: { type: "text", prefix: "$", suffix: " each" },
      })
    ).toBe("$5 each");
  });

  it("masks a password text value instead of revealing it", () => {
    const result = formatSelectorValue(hass, "hunter2", {
      text: { type: "password" },
    });
    expect(result).not.toContain("hunter2");
    expect(result).toBe("••••••••");
  });

  it("masks every value of a multiple password selector", () => {
    const result = formatSelectorValue(hass, ["one", "two"], {
      text: { type: "password" },
    });
    expect(result).not.toContain("one");
    expect(result).not.toContain("two");
    expect(result).toBe("••••••••, ••••••••");
  });

  it("masks a nested password field in an object selector preview", () => {
    const result = formatSelectorValue(
      hass,
      { username: "admin", password: "hunter2" },
      {
        object: {
          fields: {
            username: { selector: { text: { type: "text" } } },
            password: { selector: { text: { type: "password" } } },
          },
        },
      }
    );
    expect(result).toContain("admin");
    expect(result).not.toContain("hunter2");
    expect(result).toContain("••••••••");
  });
});

describe("formatSelectorValue duration selector", () => {
  const localizedHass = {
    locale: { language: "en" },
    localize: (key: string, values?: Record<string, unknown>) => {
      const suffix = key.split("ui.components.selectors.duration.summary.")[1];
      return {
        offset_negative: `${values?.duration} before`,
        offset_positive: `${values?.duration} after`,
        signed_negative: `-${values?.duration}`,
        signed_positive: `+${values?.duration}`,
      }[suffix]!;
    },
  } as unknown as HomeAssistant;

  it("formats a positive duration without a sign", () => {
    expect(
      formatSelectorValue(
        localizedHass,
        { hours: 1, minutes: 30 },
        { duration: {} }
      )
    ).toBe("1 hour, 30 minutes");
  });

  it("formats signed durations with an explicit sign", () => {
    expect(
      formatSelectorValue(
        localizedHass,
        { negative: true, minutes: 30 },
        { duration: { mode: "signed" } }
      )
    ).toBe("-30 minutes");
    expect(
      formatSelectorValue(localizedHass, "00:30:00", {
        duration: { allow_negative: true },
      })
    ).toBe("+30 minutes");
  });

  it("formats offsets as before or after", () => {
    expect(
      formatSelectorValue(
        localizedHass,
        { negative: true, hours: 1, minutes: 30 },
        { duration: { mode: "offset" } }
      )
    ).toBe("1 hour, 30 minutes before");
    expect(
      formatSelectorValue(localizedHass, "-00:10:00", {
        duration: { mode: "offset" },
      })
    ).toBe("10 minutes before");
    expect(
      formatSelectorValue(localizedHass, 45, { duration: { mode: "offset" } })
    ).toBe("45 seconds after");
    expect(
      formatSelectorValue(
        localizedHass,
        { minutes: -5 },
        { duration: { mode: "offset" } }
      )
    ).toBe("5 minutes before");
  });

  it("returns an empty string for a zero offset", () => {
    expect(
      formatSelectorValue(
        localizedHass,
        { hours: 0, minutes: 0, seconds: 0 },
        { duration: { mode: "offset" } }
      )
    ).toBe("");
  });
});
