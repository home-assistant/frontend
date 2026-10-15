import { describe, expect, it } from "vitest";
import {
  addRecentTargets,
  configTargets,
  parseRecentTarget,
} from "../../../../src/panels/config/automation/target/recent_targets";

describe("parseRecentTarget", () => {
  it("works", () => {
    expect(parseRecentTarget("area________kitchen")).toEqual([
      "area",
      "kitchen",
    ]);
    // Malformed entries and structural buckets are rejected
    expect(parseRecentTarget(null)).toBeUndefined();
    expect(parseRecentTarget("device________")).toBeUndefined();
    expect(parseRecentTarget("entity_light________")).toBeUndefined();
  });
});

describe("addRecentTargets", () => {
  const add = (
    recents: string[] | undefined,
    oldConfig: unknown,
    newConfig: unknown
  ) =>
    addRecentTargets(
      recents,
      configTargets(oldConfig),
      configTargets(newConfig)
    );

  it("only adds targets that are new in the changed config", () => {
    // Target selector of a platform trigger
    expect(
      add(
        ["area________kitchen"],
        { trigger: "light.turned_on", target: { entity_id: "light.a" } },
        {
          trigger: "light.turned_on",
          target: { entity_id: ["light.a", "light.b"], area_id: "kitchen" },
        }
      )
    ).toEqual(["entity________light.b", "area________kitchen"]);
    // Entity and device pickers store their ids at the top level
    expect(
      add(
        undefined,
        { trigger: "device", domain: "light" },
        { trigger: "device", domain: "light", device_id: "abc" }
      )
    ).toEqual(["device________abc"]);
  });

  it("keeps the list when nothing was added", () => {
    const recents = ["area________kitchen"];
    expect(
      add(
        recents,
        { condition: "state", entity_id: ["light.a"] },
        { condition: "state", entity_id: ["light.a"], state: "on" }
      )
    ).toBe(recents);
    // A target that moved from service data into the target isn't new
    expect(
      add(
        recents,
        { action: "light.turn_on", data: { entity_id: "light.a" } },
        { action: "light.turn_on", target: { entity_id: "light.a" }, data: {} }
      )
    ).toBe(recents);
  });

  it("skips templates and special entity ids", () => {
    expect(
      add(undefined, undefined, {
        action: "light.turn_on",
        target: {
          entity_id: ["all", "{{ states.light | list }}"],
          floor_id: "ground",
        },
      })
    ).toEqual(["floor________ground"]);
    expect(
      add(undefined, undefined, { action: "light.turn_on", target: "{{ t }}" })
    ).toBeUndefined();
  });
});
