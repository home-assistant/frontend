import { describe, expect, it } from "vitest";
import {
  addToExclude,
  applyExclusionChanges,
  buildTargetRow,
  computeExclusionsPerTarget,
  removeFromExclude,
  resolveItemExclusions,
  targetItems,
  targetRowState,
  toggleTargetRow,
  withExclude,
} from "../../../src/components/target-picker/target-exclusions";
import type { HomeAssistant } from "../../../src/types";
import type {
  TargetExclusion,
  TargetRow,
} from "../../../src/components/target-picker/target-exclusions";
import type { ExtractFromTargetResultReferenced } from "../../../src/data/target";
import {
  mockDevice,
  mockEntity,
} from "../../common/entity/context/context-mock";

const entries = (
  referenced: Partial<ExtractFromTargetResultReferenced>
): ExtractFromTargetResultReferenced => ({
  referenced_areas: [],
  referenced_devices: [],
  referenced_entities: [],
  ...referenced,
});

describe("targetItems", () => {
  it("lists what a target includes, not what it excludes", () => {
    expect(
      targetItems({
        entity_id: "light.a",
        area_id: ["kitchen", "hallway"],
        // @ts-expect-error exclude is not part of a plain target
        exclude: { device_id: "tv" },
      })
    ).toEqual([
      { type: "entity", id: "light.a" },
      { type: "area", id: "kitchen" },
      { type: "area", id: "hallway" },
    ]);
  });
});

describe("computeExclusionsPerTarget", () => {
  const kitchen = {
    type: "area" as const,
    id: "kitchen",
    entities: ["light.table", "light.main", "light.night"],
  };
  const hallway = {
    type: "area" as const,
    id: "hallway",
    entities: ["light.hall", "light.night_hall"],
  };

  it("lists an exclusion under each target it takes something out of", () => {
    const { perTarget, noEffect } = computeExclusionsPerTarget(
      [kitchen, hallway],
      [
        {
          type: "label",
          id: "nightlights",
          entities: ["light.night", "light.night_hall", "light.bedroom"],
        },
        { type: "entity", id: "light.main", entities: ["light.main"] },
      ]
    );

    // The label cuts from both areas, so it shows under both and can't be
    // rewritten from either one alone.
    expect(perTarget["area:kitchen"]).toEqual([
      {
        type: "label",
        id: "nightlights",
        removed: ["light.night"],
        shared: true,
      },
      {
        type: "entity",
        id: "light.main",
        removed: ["light.main"],
        shared: false,
      },
    ]);
    expect(perTarget["area:hallway"]).toEqual([
      {
        type: "label",
        id: "nightlights",
        removed: ["light.night_hall"],
        shared: true,
      },
    ]);
    expect(noEffect).toEqual([]);
  });

  it("puts exclusions that take nothing out apart, like deleted ones", () => {
    const { perTarget, noEffect } = computeExclusionsPerTarget(
      [kitchen],
      [
        { type: "area", id: "office", entities: ["light.desk"] },
        { type: "device", id: "deleted_device", entities: [] },
      ]
    );

    expect(perTarget).toEqual({});
    expect(noEffect).toEqual([
      { type: "area", id: "office" },
      { type: "device", id: "deleted_device" },
    ]);
  });
});

describe("exclude editing", () => {
  it("adds an item once", () => {
    const exclude = addToExclude(undefined, { type: "label", id: "xmas" });
    expect(exclude).toEqual({ label_id: ["xmas"] });
    expect(addToExclude(exclude, { type: "label", id: "xmas" })).toBe(exclude);
    expect(addToExclude(exclude, { type: "area", id: "kitchen" })).toEqual({
      label_id: ["xmas"],
      area_id: ["kitchen"],
    });
  });

  it("drops empty keys and the exclude itself once it is empty", () => {
    const exclude = { label_id: "xmas", area_id: ["kitchen", "hallway"] };
    expect(removeFromExclude(exclude, { type: "label", id: "xmas" })).toEqual({
      area_id: ["kitchen", "hallway"],
    });
    expect(
      removeFromExclude({ label_id: "xmas" }, { type: "label", id: "xmas" })
    ).toBeUndefined();
  });

  it("keeps the exclude only while something is included", () => {
    expect(
      withExclude({ area_id: "kitchen" }, { entity_id: ["light.a"] })
    ).toEqual({ area_id: "kitchen", exclude: { entity_id: ["light.a"] } });
    expect(
      withExclude(
        { area_id: "kitchen", exclude: { entity_id: "light.a" } },
        undefined
      )
    ).toEqual({ area_id: "kitchen" });
    expect(
      withExclude({ exclude: { entity_id: "light.a" } }, { entity_id: "x" })
    ).toBeUndefined();
  });
});

describe("resolveItemExclusions", () => {
  it("resolves excludes with every entity, like core", async () => {
    // The device has a primary light and a config switch; only resolving
    // without primary_entities_only finds the switch.
    const callWS = async ({
      target,
      primary_entities_only,
    }: {
      target: { device_id?: string[]; area_id?: string[] };
      primary_entities_only: boolean;
    }) => ({
      referenced_entities: target.device_id
        ? primary_entities_only
          ? ["light.lamp"]
          : ["light.lamp", "switch.lamp_config"]
        : ["switch.lamp_config"],
      referenced_devices: [],
      referenced_areas: [],
    });
    const hass = { callWS, states: {} } as unknown as HomeAssistant;

    expect(
      await resolveItemExclusions(
        hass,
        { type: "entity", id: "switch.lamp_config" },
        { device_id: ["lamp"] },
        true
      )
    ).toEqual([
      {
        type: "device",
        id: "lamp",
        removed: ["switch.lamp_config"],
        shared: false,
      },
    ]);
  });
});

// A floor with a kitchen (a switch with two lights, plus a lamp of its own)
// and a hallway light.
const floorEntities = {
  "light.table": mockEntity({ entity_id: "light.table", device_id: "switch" }),
  "light.main": mockEntity({ entity_id: "light.main", device_id: "switch" }),
  "light.lamp": mockEntity({ entity_id: "light.lamp", area_id: "kitchen" }),
  "light.hall": mockEntity({ entity_id: "light.hall", area_id: "hallway" }),
};
const floorDevices = {
  switch: mockDevice({ id: "switch", area_id: "kitchen" }),
};
const floor = entries({
  referenced_areas: ["kitchen", "hallway"],
  referenced_devices: ["switch"],
  referenced_entities: Object.keys(floorEntities),
});

const ground = buildTargetRow(
  "floor",
  "ground",
  floor,
  floorEntities,
  floorDevices
);

// The row of `key` anywhere in the details of the ground floor.
const rowOf = (key: string, row: TargetRow = ground): TargetRow | undefined =>
  `${row.type}:${row.id}` === key
    ? row
    : row.children
        .map((child) => rowOf(key, child))
        .find((found) => found !== undefined);

const row = (key: string) => rowOf(key)!;

const kitchenOut: TargetExclusion = {
  type: "area",
  id: "kitchen",
  removed: ["light.table", "light.main", "light.lamp"],
  shared: false,
};

const stateOf = (key: string, exclusions: TargetExclusion[]) =>
  targetRowState(row(key), key === "floor:ground", exclusions);

const toggle = (
  key: string,
  selected: boolean,
  exclusions: TargetExclusion[],
  initial: TargetExclusion[] = exclusions,
  otherTargetEntities?: ReadonlySet<string>
) =>
  toggleTargetRow({
    row: row(key),
    isTarget: key === "floor:ground",
    selected,
    exclusions,
    initial,
    otherTargetEntities,
  });

describe("buildTargetRow", () => {
  it("lays the floor out like the details show it", () => {
    const keys = (r: TargetRow): unknown => ({
      [`${r.type}:${r.id}`]: r.children.map(keys),
    });
    expect(keys(ground)).toEqual({
      "floor:ground": [
        {
          "area:kitchen": [
            {
              "device:switch": [
                { "entity:light.table": [] },
                { "entity:light.main": [] },
              ],
            },
            { "entity:light.lamp": [] },
          ],
        },
        { "area:hallway": [{ "entity:light.hall": [] }] },
      ],
    });
  });

  it("gives an area only the entities in it", () => {
    expect(row("area:kitchen").entities).toEqual([
      "light.table",
      "light.main",
      "light.lamp",
    ]);
    expect(row("area:hallway").entities).toEqual(["light.hall"]);
  });
});

describe("targetRowState", () => {
  it("locks what an excluded area holds, but not the area's own row", () => {
    expect(stateOf("entity:light.table", [kitchenOut])).toEqual({
      checked: false,
      indeterminate: false,
      disabled: true,
      lockedBy: [{ type: "area", id: "kitchen" }],
    });
    expect(stateOf("device:switch", [kitchenOut]).disabled).toBe(true);
    expect(stateOf("area:kitchen", [kitchenOut])).toEqual({
      checked: false,
      indeterminate: false,
      disabled: false,
      lockedBy: [],
    });
    expect(stateOf("floor:ground", [kitchenOut])).toMatchObject({
      checked: false,
      indeterminate: true,
      disabled: false,
    });
  });

  it("locks what a label takes out everywhere", () => {
    const xmas: TargetExclusion = {
      type: "label",
      id: "xmas",
      removed: ["light.lamp"],
      shared: false,
    };
    expect(stateOf("entity:light.lamp", [xmas])).toMatchObject({
      disabled: true,
      lockedBy: [{ type: "label", id: "xmas" }],
    });
    // Checked, so a click unticks the area instead of asking to bring back
    // what only the label can.
    expect(stateOf("area:kitchen", [xmas])).toMatchObject({
      checked: true,
      indeterminate: true,
      disabled: false,
    });
    expect(toggle("area:kitchen", false, [xmas])).toEqual([xmas, kitchenOut]);
  });

  it("leaves an excluded entity editable", () => {
    expect(
      stateOf("entity:light.main", [
        {
          type: "entity",
          id: "light.main",
          removed: ["light.main"],
          shared: false,
        },
      ])
    ).toEqual({
      checked: false,
      indeterminate: false,
      disabled: false,
      lockedBy: [],
    });
  });
});

describe("toggleTargetRow", () => {
  it("can't re-include part of an excluded area", () => {
    expect(toggle("entity:light.table", true, [kitchenOut])).toEqual([
      kitchenOut,
    ]);
    expect(toggle("device:switch", true, [kitchenOut])).toEqual([kitchenOut]);
  });

  it("removes the area exclusion when its row is ticked again", () => {
    const exclusions = toggle("area:kitchen", true, [kitchenOut]);
    expect(exclusions).toEqual([]);
    expect(stateOf("entity:light.table", exclusions).checked).toBe(true);
  });

  it("brings back only what a parent row can undo", () => {
    const xmas: TargetExclusion = {
      type: "label",
      id: "xmas",
      removed: ["light.lamp"],
      shared: false,
    };
    const main: TargetExclusion = {
      type: "entity",
      id: "light.main",
      removed: ["light.main"],
      shared: false,
    };
    // Shared with another target: only its own row takes it away.
    const switchOut: TargetExclusion = {
      type: "device",
      id: "switch",
      removed: ["light.table", "light.main"],
      shared: true,
    };
    expect(toggle("floor:ground", true, [xmas, main, switchOut])).toEqual([
      xmas,
      switchOut,
    ]);
    expect(toggle("device:switch", true, [switchOut])).toEqual([]);
  });

  it("excludes an unticked area as the area", () => {
    expect(toggle("area:kitchen", false, [])).toEqual([kitchenOut]);
    expect(toggle("entity:light.hall", false, [])).toEqual([
      {
        type: "entity",
        id: "light.hall",
        removed: ["light.hall"],
        shared: false,
      },
    ]);
  });

  it("unticks the rows of the target instead of the target itself", () => {
    expect(
      toggle("floor:ground", false, []).map(({ type, id }) => `${type}:${id}`)
    ).toEqual(["area:kitchen", "area:hallway"]);
  });

  it("marks a new exclusion shared when another target holds its entities", () => {
    // The kitchen is also selected on its own next to the floor.
    const kitchen = new Set(row("area:kitchen").entities);
    const [lampOut] = toggle("entity:light.lamp", false, [], [], kitchen);
    expect(lampOut.shared).toBe(true);
    // So ticking a parent doesn't take it out of the other target too.
    expect(toggle("floor:ground", true, [lampOut], [])).toEqual([lampOut]);
    expect(toggle("entity:light.hall", false, [], [], kitchen)[0].shared).toBe(
      false
    );
  });

  it("gives an exclusion back as it was when it is unticked again", () => {
    const shared = { ...kitchenOut, shared: true };
    expect(toggle("area:kitchen", false, [], [shared])).toEqual([shared]);
  });
});

describe("applyExclusionChanges", () => {
  const xmas: TargetExclusion = {
    type: "label",
    id: "xmas",
    removed: ["light.lamp"],
    shared: true,
  };

  it("adds an unticked area as area_id", () => {
    expect(
      applyExclusionChanges(undefined, [], toggle("area:kitchen", false, []))
    ).toEqual({ area_id: ["kitchen"] });
  });

  it("leaves unrelated exclusions as they are", () => {
    // The tv is excluded from another target, the label from this one too.
    const exclude = {
      device_id: ["tv"],
      label_id: ["xmas"],
      area_id: ["kitchen"],
    };
    const initial = [kitchenOut, xmas];
    expect(
      applyExclusionChanges(
        exclude,
        initial,
        toggle("area:kitchen", true, initial)
      )
    ).toEqual({ device_id: ["tv"], label_id: ["xmas"] });
  });

  it("leaves an unchanged selection as it is", () => {
    const exclude = { area_id: ["kitchen"], label_id: ["xmas"] };
    expect(
      applyExclusionChanges(exclude, [kitchenOut, xmas], [kitchenOut, xmas])
    ).toBe(exclude);
  });

  it("drops the exclude when everything is ticked again", () => {
    expect(
      applyExclusionChanges({ area_id: ["kitchen"] }, [kitchenOut], [])
    ).toBeUndefined();
  });
});
