import { describe, expect, it } from "vitest";
import type { LocalizeFunc } from "../../../../src/common/translations/localize";
import type { ConfigPath } from "../../../../src/common/util/config-path";
import type { ConfigValidationError } from "../../../../src/data/config";
import {
  configErrorPath,
  errorMessage,
  errorOwner,
  errorText,
  fieldErrors,
  ownedErrors,
  rowPathsShifted,
} from "../../../../src/panels/config/automation/automation-errors";
import {
  AutomationRowRegistry,
  type AutomationPathRow,
} from "../../../../src/panels/config/automation/automation-path";

const createRow = (collapsed = false) =>
  ({
    selected: false,
    collapsed,
    openSidebar: () => undefined,
    expand: () => undefined,
  }) as unknown as AutomationPathRow;

const validationError = (
  message: string,
  path: ConfigPath
): ConfigValidationError => ({
  message,
  path,
  code: null,
  translation_key: null,
  translation_domain: null,
  translation_placeholders: {},
});

const TRANSLATIONS: Record<string, string> = {
  "ui.panel.config.automation.editor.errors.field_message":
    "{field}: {message}",
  "ui.panel.config.automation.editor.errors.validation.required_field":
    "{field} is required.",
  "ui.panel.config.automation.editor.errors.validation.value_one_of":
    "Choose one of {values}.",
};

const localize = ((key: string, values: Record<string, string> = {}) =>
  (TRANSLATIONS[key] ?? "").replace(
    /\{(\w+)\}/g,
    (_, name: string) => values[name]
  )) as LocalizeFunc;

describe("automation errors", () => {
  it("belong to the deepest rendered row on their path", () => {
    const registry = new AutomationRowRegistry();
    const block = createRow();
    const nested = createRow();
    const other = createRow();
    registry.register(["actions", 0], block);
    registry.register(["actions", 0, "then", 0], nested);
    registry.register(["actions", 1], other);

    const inNested = validationError("a", ["actions", 0, "then", 0, "delay"]);
    // The nested row of this path is not rendered, so its block owns it
    const inCollapsed = validationError("b", ["actions", 0, "else", 0]);
    const global = validationError("c", ["mode"]);
    const noPath = validationError("d", []);
    const errors = [inNested, inCollapsed, global, noPath];

    expect(errorOwner(registry, inNested)).toBe(nested);
    expect(ownedErrors(registry, errors, block)).toEqual([inCollapsed]);
    expect(ownedErrors(registry, errors, nested)).toEqual([inNested]);
    expect(ownedErrors(registry, errors, other)).toEqual([]);
    expect(errorOwner(registry, global)).toBeUndefined();
    expect(errorOwner(registry, noPath)).toBeUndefined();

    // A collapsed block keeps the rows inside rendered but hidden, so it
    // shows their errors
    const collapsed = createRow(true);
    registry.register(["actions", 2], collapsed);
    registry.register(["actions", 2, "then", 0], createRow(true));
    const hidden = validationError("e", ["actions", 2, "then", 0, "delay"]);
    expect(errorOwner(registry, hidden)).toBe(collapsed);
  });

  it("map to form fields and read relative to a row", () => {
    const errors = [
      validationError("bad for", ["triggers", 1, "for", "hours"]),
      validationError("second for", ["triggers", 1, "for"]),
      validationError("bad entity", ["triggers", 1, "entity_id"]),
      validationError("row itself", ["triggers", 1]),
      validationError("other row", ["triggers", 2, "for"]),
    ];
    expect(fieldErrors(localize, errors, ["triggers", 1])).toEqual({
      for: "bad for",
      entity_id: "bad entity",
    });
    expect(fieldErrors(localize, errors, ["triggers", 3])).toEqual({});

    expect(errorText(localize, errors[0], ["triggers", 1])).toBe(
      "for.hours: bad for"
    );
    expect(errorText(localize, errors[3], ["triggers", 1])).toBe("row itself");
    expect(errorText(localize, errors[4])).toBe("triggers[2].for: other row");
  });

  it("are translated when the frontend knows their key", () => {
    const oneOf = {
      ...validationError("value must be one of ['single', 'queued']", ["mode"]),
      translation_key: "value_one_of",
      translation_placeholders: { values: ["single", "queued"] },
    };
    expect(errorMessage(localize, oneOf)).toBe("Choose one of single, queued.");
    expect(errorText(localize, oneOf)).toBe(
      "mode: Choose one of single, queued."
    );
    // Keys of an integration are not in the frontend translations
    expect(
      errorMessage(localize, { ...oneOf, translation_domain: "light" })
    ).toBe(oneOf.message);
    expect(
      errorMessage(localize, { ...oneOf, translation_key: "expected_type" })
    ).toBe(oneOf.message);

    // Errors shown above a field name it
    expect(errorMessage(localize, oneOf, "Mode")).toBe(
      "Mode: Choose one of single, queued."
    );
    expect(errorMessage(localize, oneOf, "For each:")).toBe(
      "For each: Choose one of single, queued."
    );
    expect(
      errorMessage(
        localize,
        {
          ...validationError("required key not provided", ["entity_id"]),
          translation_key: "required",
        },
        "Entity"
      )
    ).toBe("Entity is required.");
  });

  it("get the index of a block written as a single item", () => {
    const config = {
      actions: [
        {
          choose: {
            conditions: { condition: "state" },
            sequence: [{ delay: 1 }],
          },
          default: { delay: "abc" },
        },
        { action: "light.turn_on", data: { default: { a: 1 } } },
        { repeat: { while: { condition: "template" }, sequence: [] } },
      ],
    };
    expect(
      configErrorPath(config, ["actions", 0, "choose", "conditions", "state"])
    ).toEqual(["actions", 0, "choose", 0, "conditions", 0, "state"]);
    expect(
      configErrorPath(config, ["actions", 0, "choose", "sequence", 0, "delay"])
    ).toEqual(["actions", 0, "choose", 0, "sequence", 0, "delay"]);
    expect(configErrorPath(config, ["actions", 0, "default", "delay"])).toEqual(
      ["actions", 0, "default", 0, "delay"]
    );
    expect(
      configErrorPath(config, ["actions", 2, "repeat", "while", "value"])
    ).toEqual(["actions", 2, "repeat", "while", 0, "value"]);
    // Keys inside fields are not blocks
    expect(
      configErrorPath(config, ["actions", 1, "data", "default", "a"])
    ).toEqual(["actions", 1, "data", "default", "a"]);
    // Errors about the block itself
    expect(configErrorPath(config, ["actions", 0, "default"])).toEqual([
      "actions",
      0,
      "default",
    ]);
    expect(configErrorPath(config, ["mode"])).toEqual(["mode"]);
  });

  it("tell when rows may sit at other paths", () => {
    const delay = { delay: 1 };
    const light = { action: "light.turn_on", data: { brightness: 10 } };
    const option = { conditions: [], sequence: [delay] };
    const choose = { choose: [option] };
    const config = { triggers: [], actions: [delay, light, choose] };
    const withActions = (actions: unknown[]) => ({ ...config, actions });

    // Edits replace one item on their way down
    expect(
      rowPathsShifted(
        config,
        withActions([delay, { ...light, data: { brightness: 20 } }, choose])
      )
    ).toBe(false);
    expect(
      rowPathsShifted(
        config,
        withActions([
          delay,
          light,
          { choose: [{ ...option, sequence: [{ delay: 2 }] }] },
        ])
      )
    ).toBe(false);
    // Lists inside fields like `data` hold no rows
    expect(
      rowPathsShifted(
        config,
        withActions([
          delay,
          { ...light, data: { actions: [{ title: "a" }, { title: "b" }] } },
          choose,
        ])
      )
    ).toBe(false);
    // A template condition written as a string keeps its path as an object
    expect(
      rowPathsShifted(
        { conditions: ["{{ a }}"] },
        { conditions: [{ condition: "template", value_template: "{{ a }}" }] }
      )
    ).toBe(false);
    // A new block moves no other row
    expect(rowPathsShifted(config, { ...config, conditions: [delay] })).toBe(
      false
    );

    // Moves, inserts and deletes
    expect(rowPathsShifted(config, withActions([light, delay, choose]))).toBe(
      true
    );
    expect(rowPathsShifted(config, withActions([delay, choose]))).toBe(true);
    expect(
      rowPathsShifted(config, withActions([delay, delay, light, choose]))
    ).toBe(true);
    expect(
      rowPathsShifted(
        config,
        withActions([
          delay,
          light,
          { choose: [{ conditions: [], sequence: [] }] },
        ])
      )
    ).toBe(true);
    // A removed block takes its rows with it
    expect(
      rowPathsShifted(
        { actions: [{ if: [], then: [delay], else: [light] }] },
        { actions: [{ if: [], then: [delay] }] }
      )
    ).toBe(true);
    // Rows swapped between blocks
    expect(
      rowPathsShifted(
        { actions: [{ if: [], then: [delay], else: [light] }] },
        { actions: [{ if: [], then: [light], else: [delay] }] }
      )
    ).toBe(true);
    // Parsed from YAML again, every row is a new object
    expect(rowPathsShifted(config, structuredClone(config))).toBe(true);
  });
});
