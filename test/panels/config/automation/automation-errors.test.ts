import { describe, expect, it } from "vitest";
import {
  configErrorPath,
  errorOwner,
  errorsOnKnownItems,
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

describe("automation errors", () => {
  it("belong to the deepest rendered row on their path", () => {
    const registry = new AutomationRowRegistry();
    const block = createRow();
    const nested = createRow();
    const other = createRow();
    registry.register(["actions", 0], block);
    registry.register(["actions", 0, "then", 0], nested);
    registry.register(["actions", 1], other);

    const inNested = { message: "a", path: ["actions", 0, "then", 0, "delay"] };
    // The nested row of this path is not rendered, so its block owns it
    const inCollapsed = { message: "b", path: ["actions", 0, "else", 0] };
    const global = { message: "c", path: ["mode"] };
    const noPath = { message: "d", path: [] };
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
      { message: "bad for", path: ["triggers", 1, "for", "hours"] },
      { message: "second for", path: ["triggers", 1, "for"] },
      { message: "bad entity", path: ["triggers", 1, "entity_id"] },
      { message: "row itself", path: ["triggers", 1] },
      { message: "other row", path: ["triggers", 2, "for"] },
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

  it("map core paths back to the edited config", () => {
    const config = {
      triggers: [
        { trigger: "event" },
        { triggers: [{ trigger: "state" }, { trigger: "time" }] },
        { trigger: "sun" },
      ],
      actions: [
        { delay: 1 },
        { wait_for_trigger: [{ triggers: { trigger: "event" } }] },
      ],
    };
    expect(configErrorPath(config, ["triggers", 0, "for"])).toEqual([
      "triggers",
      0,
      "for",
    ]);
    expect(configErrorPath(config, ["triggers", 2, "for"])).toEqual([
      "triggers",
      1,
      "triggers",
      1,
      "for",
    ]);
    expect(configErrorPath(config, ["triggers", 3])).toEqual(["triggers", 2]);
    expect(
      configErrorPath(config, ["actions", 1, "wait_for_trigger", 0, "x"])
    ).toEqual(["actions", 1, "wait_for_trigger", 0, "triggers", 0, "x"]);
    // Paths that don't resolve stay as they are
    expect(configErrorPath(config, ["triggers", 9, "for"])).toEqual([
      "triggers",
      9,
      "for",
    ]);
    expect(configErrorPath(config, ["mode"])).toEqual(["mode"]);

    // Core wraps each action of the parallel shorthand in a sequence
    const parallel = {
      actions: [
        {
          parallel: [{ delay: 1 }, { sequence: [{ delay: 1 }, { delay: 2 }] }],
        },
      ],
    };
    expect(
      configErrorPath(parallel, [
        "actions",
        0,
        "parallel",
        0,
        "sequence",
        0,
        "delay",
      ])
    ).toEqual(["actions", 0, "parallel", 0, "delay"]);
    expect(
      configErrorPath(parallel, ["actions", 0, "parallel", 1, "sequence", 1])
    ).toEqual(["actions", 0, "parallel", 1, "sequence", 1]);
  });

  it("keep only live errors on items that already had one", () => {
    const a = { trigger: "state", entity_id: ["sensor.a"], for: "abc" };
    const b = { trigger: "event", event_type: "b" };
    const c = { trigger: "state", entity_id: "sensor.c", for: "xyz" };
    const before = { triggers: [a, b, c] };
    const known = knownErrorItems(before, [
      { message: "bad for", path: ["triggers", 0, "for"] },
      { message: "bad for", path: ["triggers", 2, "for"] },
    ]);

    const editedA = { ...a, for: "abd" };
    const edited = { triggers: [editedA, b, c] };
    const sameItem = { message: "bad for", path: ["triggers", 0, "for"] };
    // A value list entry belongs to the trigger, not to a row of its own
    const valueEntry = {
      message: "bad entity",
      path: ["triggers", 0, "entity_id", 0],
    };
    const otherItem = { message: "new", path: ["triggers", 1, "event_type"] };
    expect(
      errorsOnKnownItems(known, edited, [sameItem, valueEntry, otherItem])
    ).toEqual([sameItem, valueEntry]);

    // Deleting a row moves the error of the next one to another index
    const deleted = { triggers: [b, c] };
    const moved = { message: "bad for", path: ["triggers", 1, "for"] };
    expect(errorsOnKnownItems(known, deleted, [moved])).toEqual([moved]);

    // YAML is parsed again on every edit, so the items are new objects
    const reparsed = structuredClone(deleted);
    expect(errorsOnKnownItems(known, reparsed, [moved])).toEqual([moved]);

    // A moved item is followed, so editing it afterwards keeps its error
    const knownC = knownErrorItems(before, [
      { message: "bad for", path: ["triggers", 2, "for"] },
    ]);
    const movedC = { message: "bad for", path: ["triggers", 0, "for"] };
    const editedC = { triggers: [{ ...c, for: "xyy" }, a, b] };
    expect(errorsOnKnownItems(knownC, editedC, [movedC])).toEqual([]);
    const followed = followKnownErrorItems(knownC, { triggers: [c, a, b] });
    expect(errorsOnKnownItems(followed, editedC, [movedC])).toEqual([movedC]);

    // An item edited at its known path is followed when it moves afterwards
    const cEdited = { ...c, for: "xyy" };
    const afterEdit = followKnownErrorItems(knownC, {
      triggers: [a, b, cEdited],
    });
    const afterMove = followKnownErrorItems(afterEdit, {
      triggers: [cEdited, a, b],
    });
    expect(
      errorsOnKnownItems(afterMove, { triggers: [cEdited, a, b] }, [movedC])
    ).toEqual([movedC]);
  });
});
