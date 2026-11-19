import { describe, it, expect } from "vitest";
import {
  formatSelectorValue,
  type FormatSelectorValueOptions,
} from "../../src/data/selector/format_selector_value";

// These selectors read none of the options.
const options = {} as FormatSelectorValueOptions;

describe("formatSelectorValue", () => {
  it("returns an empty string for nullish values", () => {
    expect(formatSelectorValue(options, null)).toBe("");
    expect(formatSelectorValue(options, undefined)).toBe("");
  });

  it("renders a plain text value", () => {
    expect(
      formatSelectorValue(options, "hello", { text: { type: "text" } })
    ).toBe("hello");
  });

  it("applies prefix and suffix for text selectors", () => {
    expect(
      formatSelectorValue(options, "5", {
        text: { type: "text", prefix: "$", suffix: " each" },
      })
    ).toBe("$5 each");
  });

  it("masks a password text value instead of revealing it", () => {
    const result = formatSelectorValue(options, "hunter2", {
      text: { type: "password" },
    });
    expect(result).not.toContain("hunter2");
    expect(result).toBe("••••••••");
  });

  it("masks every value of a multiple password selector", () => {
    const result = formatSelectorValue(options, ["one", "two"], {
      text: { type: "password" },
    });
    expect(result).not.toContain("one");
    expect(result).not.toContain("two");
    expect(result).toBe("••••••••, ••••••••");
  });

  it("masks a nested password field in an object selector preview", () => {
    const result = formatSelectorValue(
      options,
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
  const localizedOptions = {
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
  } as unknown as FormatSelectorValueOptions;

  it("formats a positive duration without a sign", () => {
    expect(
      formatSelectorValue(
        localizedOptions,
        { hours: 1, minutes: 30 },
        { duration: {} }
      )
    ).toBe("1 hour, 30 minutes");
  });

  it("formats signed durations with an explicit sign", () => {
    expect(
      formatSelectorValue(
        localizedOptions,
        { minutes: -30 },
        { duration: { mode: "signed" } }
      )
    ).toBe("-30 minutes");
    expect(
      formatSelectorValue(localizedOptions, "00:30:00", {
        duration: { allow_negative: true },
      })
    ).toBe("+30 minutes");
  });

  it("formats offsets as before or after", () => {
    expect(
      formatSelectorValue(
        localizedOptions,
        { hours: -1, minutes: -30 },
        { duration: { mode: "offset" } }
      )
    ).toBe("1 hour, 30 minutes before");
    expect(
      formatSelectorValue(localizedOptions, "-00:10:00", {
        duration: { mode: "offset" },
      })
    ).toBe("10 minutes before");
    expect(
      formatSelectorValue(localizedOptions, 45, {
        duration: { mode: "offset" },
      })
    ).toBe("45 seconds after");
    expect(
      formatSelectorValue(
        localizedOptions,
        { minutes: -5 },
        { duration: { mode: "offset" } }
      )
    ).toBe("5 minutes before");
  });

  it("returns an empty string for a zero offset", () => {
    expect(
      formatSelectorValue(
        localizedOptions,
        { hours: 0, minutes: 0, seconds: 0 },
        { duration: { mode: "offset" } }
      )
    ).toBe("");
  });
});

describe("formatSelectorValue ui_color selector", () => {
  const colorOptions = {
    localize: (key: string) => `localized:${key}`,
  } as unknown as FormatSelectorValueOptions;

  it("localizes theme colors and special values", () => {
    expect(formatSelectorValue(colorOptions, "red", { ui_color: {} })).toBe(
      "localized:ui.components.color-picker.colors.red"
    );
    expect(formatSelectorValue(colorOptions, "none", { ui_color: {} })).toBe(
      "localized:ui.components.color-picker.none"
    );
  });

  it("uses the label of an extra option", () => {
    expect(
      formatSelectorValue(colorOptions, "custom", {
        ui_color: { extra_options: [{ value: "custom", label: "My color" }] },
      })
    ).toBe("My color");
  });

  it("shows custom colors as written", () => {
    expect(formatSelectorValue(colorOptions, "#ff0000", { ui_color: {} })).toBe(
      "#ff0000"
    );
    expect(formatSelectorValue(colorOptions, "Red", { ui_color: {} })).toBe(
      "Red"
    );
  });
});

describe("formatSelectorValue select selector", () => {
  const selectOptions = {
    localize: (key: string) => (key.endsWith(".heat") ? "Heating" : ""),
    translationDomain: "climate",
  } as FormatSelectorValueOptions;
  const selector = {
    select: {
      translation_key: "mode",
      options: [
        { value: "heat", label: "heat" },
        { value: "cool", label: "Cooling" },
      ],
    },
  };

  it("prefers translations and falls back to option labels and raw values", () => {
    expect(
      formatSelectorValue(selectOptions, ["heat", "cool", "custom"], selector)
    ).toBe("Heating, Cooling, custom");
  });

  it("falls back to raw values for string options without translations", () => {
    expect(
      formatSelectorValue(selectOptions, "cool", {
        select: { translation_key: "mode", options: ["heat", "cool"] },
      })
    ).toBe("cool");
  });

  it("uses option labels without a translation domain", () => {
    expect(formatSelectorValue(options, ["heat", "cool"], selector)).toBe(
      "heat, Cooling"
    );
  });
});

describe("formatSelectorValue state selector", () => {
  const entity = {
    entity_id: "climate.living_room",
    state: "heat",
    attributes: {},
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  };
  const stateOptions = {
    states: { [entity.entity_id]: entity },
    entityId: entity.entity_id,
    formatEntityState: (_entity, value) => `state:${value}`,
    formatEntityAttributeValue: (_entity, attribute, value) =>
      `${attribute}:${value}`,
  } satisfies Partial<FormatSelectorValueOptions>;
  const formatOptions = stateOptions as FormatSelectorValueOptions;

  it("formats states using the supplied entity context", () => {
    expect(
      formatSelectorValue(formatOptions, ["heat", "cool"], { state: {} })
    ).toBe("state:heat, state:cool");
  });

  it("prefers an explicit entity ID over the context entity", () => {
    expect(
      formatSelectorValue(formatOptions, "heat", {
        state: { entity_id: "climate.missing" },
      })
    ).toBe("heat");
  });

  it("formats attribute values with the entity attribute formatter", () => {
    expect(
      formatSelectorValue(formatOptions, 22, {
        state: { attribute: "temperature" },
      })
    ).toBe("temperature:22");
  });

  it("prefers extra option labels even without an entity", () => {
    expect(
      formatSelectorValue(
        { states: {} } as FormatSelectorValueOptions,
        ["any", "heat"],
        {
          state: { extra_options: [{ value: "any", label: "Any state" }] },
        }
      )
    ).toBe("Any state, heat");
  });

  it("falls back to raw values without optional formatters", () => {
    const rawOptions = {
      states: stateOptions.states,
      entityId: entity.entity_id,
    } as FormatSelectorValueOptions;
    expect(formatSelectorValue(rawOptions, "heat", { state: {} })).toBe("heat");
    expect(
      formatSelectorValue(rawOptions, 22, {
        state: { attribute: "temperature" },
      })
    ).toBe("22");
  });
});
