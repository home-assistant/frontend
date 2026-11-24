import { describe, expect, it } from "vitest";
import type { ConfigPath } from "../../../../src/common/util/config-path";
import type { ConfigValidationError } from "../../../../src/data/config";
import {
  configErrorPath,
  errorOwner,
  errorsOnKnownItems,
  followErrors,
  followKnownErrorItems,
  knownErrorItems,
  errorText,
  fieldErrors,
  ownedErrors,
} from "../../../../src/panels/config/automation/automation-errors";
import {
  AutomationRowRegistry,
  type AutomationPathRow,
} from "../../../../src/panels/config/automation/automation-path";

const createRow = () =>
  ({
    selected: false,
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
  });

  it("map to form fields and read relative to a row", () => {
    const errors = [
      validationError("bad for", ["triggers", 1, "for", "hours"]),
      validationError("second for", ["triggers", 1, "for"]),
      validationError("bad entity", ["triggers", 1, "entity_id"]),
      validationError("row itself", ["triggers", 1]),
      validationError("other row", ["triggers", 2, "for"]),
    ];
    expect(fieldErrors(errors, ["triggers", 1])).toEqual({
      for: "bad for",
      entity_id: "bad entity",
    });
    expect(fieldErrors(errors, ["triggers", 3])).toEqual({});

    expect(errorText(errors[0], ["triggers", 1])).toBe("for.hours: bad for");
    expect(errorText(errors[3], ["triggers", 1])).toBe("row itself");
    expect(errorText(errors[4])).toBe("triggers[2].for: other row");
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

    // Editing the single item turns the block into a list, the item keeps
    // its error
    const delayError = validationError("bad delay", [
      "actions",
      0,
      "default",
      0,
      "delay",
    ]);
    const known = knownErrorItems(config, [delayError]);
    const edited = {
      actions: [{ ...config.actions[0], default: [{ delay: "abd" }] }],
    };
    expect(
      errorsOnKnownItems(followKnownErrorItems(known, config, edited), edited, [
        delayError,
      ])
    ).toEqual([delayError]);
  });

  it("keep only live errors on items that already had one", () => {
    const a = { trigger: "state", entity_id: ["sensor.a"], for: "abc" };
    const b = { trigger: "event", event_type: "b" };
    const c = { trigger: "state", entity_id: "sensor.c", for: "xyz" };
    const forError = (index: number) =>
      validationError("bad for", ["triggers", index, "for"]);
    const before = { triggers: [a, b, c] };
    const known = knownErrorItems(before, [forError(0), forError(2)]);

    // Edited in place, the item keeps its errors; a value list entry belongs
    // to the trigger, and a new error on another item waits for the save
    const edited = { triggers: [{ ...a, for: "abd" }, b, c] };
    const valueEntry = validationError("bad entity", [
      "triggers",
      0,
      "entity_id",
      0,
    ]);
    const other = validationError("new", ["triggers", 1, "event_type"]);
    expect(
      errorsOnKnownItems(followKnownErrorItems(known, before, edited), edited, [
        forError(0),
        valueEntry,
        other,
      ])
    ).toEqual([forError(0), valueEntry]);

    // Deleting a row moves the next error, and the row that takes the old
    // index doesn't count as known
    const deleted = { triggers: [b, c] };
    expect(
      errorsOnKnownItems(
        followKnownErrorItems(known, before, deleted),
        deleted,
        [forError(0), forError(1)]
      )
    ).toEqual([forError(1)]);

    // Moving a row past another doesn't make the other one known
    const swapped = { triggers: [b, a, c] };
    expect(
      errorsOnKnownItems(
        followKnownErrorItems(known, before, swapped),
        swapped,
        [forError(0), forError(1)]
      )
    ).toEqual([forError(1)]);

    // YAML is parsed again on every edit, so items are found by content
    const reparsed = structuredClone(deleted);
    expect(
      errorsOnKnownItems(
        followKnownErrorItems(known, before, reparsed),
        reparsed,
        [forError(0), forError(1)]
      )
    ).toEqual([forError(1)]);

    // Identical items both keep their errors after the YAML is parsed again
    const twice = { triggers: [a, { ...a }] };
    const knownTwice = knownErrorItems(twice, [forError(0), forError(1)]);
    const reparsedTwice = structuredClone(twice);
    expect(
      errorsOnKnownItems(
        followKnownErrorItems(knownTwice, twice, reparsedTwice),
        reparsedTwice,
        [forError(0), forError(1)]
      )
    ).toEqual([forError(0), forError(1)]);

    // An item edited and then moved keeps its errors
    const knownC = knownErrorItems(before, [forError(2)]);
    const editedC = { ...c, for: "xyy" };
    const afterEdit = { triggers: [a, b, editedC] };
    const afterMove = { triggers: [editedC, a, b] };
    const followed = followKnownErrorItems(
      followKnownErrorItems(knownC, before, afterEdit),
      afterEdit,
      afterMove
    );
    expect(
      errorsOnKnownItems(followed, afterMove, [forError(0), forError(2)])
    ).toEqual([forError(0)]);
  });

  it("follow save errors to where their items are now", () => {
    const a = { delay: "abc" };
    const b = { delay: 1 };
    const c = { wait_template: "{{ " };
    const submitted = { actions: [a, b, c] };
    const errors = [
      validationError("bad delay", ["actions", 0, "delay"]),
      validationError("bad template", ["actions", 2, "wait_template"]),
      validationError("bad mode", ["mode"]),
    ];
    // A was deleted and C moved up while saving
    expect(followErrors(errors, submitted, { actions: [c, b] })).toEqual([
      validationError("bad template", ["actions", 0, "wait_template"]),
      validationError("bad mode", ["mode"]),
    ]);
  });
});
