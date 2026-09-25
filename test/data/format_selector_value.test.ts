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
