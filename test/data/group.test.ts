import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  computeGroupMemberIds,
  filterGroupsWithListedMembers,
} from "../../src/data/group";

const entity = (
  entity_id: string,
  attributes: HassEntity["attributes"] = {}
): HassEntity =>
  ({
    entity_id,
    state: "on",
    attributes,
  }) as HassEntity;

const toStates = (...entities: HassEntity[]): HassEntities =>
  Object.fromEntries(entities.map((e) => [e.entity_id, e]));

// The home summary's lights-on count and the more-info member list rely on
// these rules to avoid counting a light twice.
describe("computeGroupMemberIds", () => {
  it("core groups: members from group_entities", () => {
    expect(
      computeGroupMemberIds(
        entity("light.wled", { group_entities: ["light.wled_segment_1"] })
      )
    ).toEqual(["light.wled_segment_1"]);
  });

  it("group helpers and Hue rooms: members from entity_id", () => {
    expect(
      computeGroupMemberIds(
        entity("light.living_room", {
          is_hue_group: true,
          entity_id: ["light.lamp"],
        })
      )
    ).toEqual(["light.lamp"]);
  });

  it("prefers group_entities over entity_id", () => {
    expect(
      computeGroupMemberIds(
        entity("light.group", {
          group_entities: ["light.a"],
          entity_id: ["light.b"],
        })
      )
    ).toEqual(["light.a"]);
  });

  it("the registry copy wins over the state", () => {
    expect(
      computeGroupMemberIds(
        entity("light.group", { group_entities: ["light.b"] }),
        { capabilities: { group_entities: ["light.a"] } }
      )
    ).toEqual(["light.a"]);
  });

  it("no entry: the state copy", () => {
    expect(
      computeGroupMemberIds(
        entity("light.group", { group_entities: ["light.b"] }),
        null
      )
    ).toEqual(["light.b"]);
  });

  it("not a group: undefined", () => {
    expect(computeGroupMemberIds(entity("light.lamp"))).toBeUndefined();
  });
});

describe("filterGroupsWithListedMembers", () => {
  const lamp = entity("light.lamp");
  const ceiling = entity("light.ceiling");
  const helperGroup = entity("light.downstairs", {
    entity_id: ["light.lamp", "light.ceiling"],
  });
  const hueRoom = entity("light.living_room", {
    is_hue_group: true,
    entity_id: ["light.lamp"],
  });

  it("drops a group whose members are counted", () => {
    const states = toStates(lamp, ceiling, helperGroup, hueRoom);
    expect(filterGroupsWithListedMembers(Object.keys(states), states)).toEqual([
      "light.lamp",
      "light.ceiling",
    ]);
  });

  it("nested groups: drops the outer group too", () => {
    const house = entity("light.house", {
      entity_id: ["light.downstairs"],
    });
    const states = toStates(lamp, ceiling, helperGroup, house);
    expect(filterGroupsWithListedMembers(Object.keys(states), states)).toEqual([
      "light.lamp",
      "light.ceiling",
    ]);
  });

  it("hidden members: the group still counts once", () => {
    // Only the group is listed, so dropping it would read "All off".
    const states = toStates(lamp, ceiling, helperGroup);
    expect(filterGroupsWithListedMembers(["light.downstairs"], states)).toEqual(
      ["light.downstairs"]
    );
  });

  it("keeps an entity missing from states", () => {
    expect(filterGroupsWithListedMembers(["light.gone"], {})).toEqual([
      "light.gone",
    ]);
  });

  it("hidden intermediate group: drops the outer group", () => {
    // House contains the hidden Downstairs group, which contains the lamp.
    const house = entity("light.house", {
      entity_id: ["light.downstairs"],
    });
    const states = toStates(lamp, ceiling, helperGroup, house);
    expect(
      filterGroupsWithListedMembers(["light.house", "light.lamp"], states)
    ).toEqual(["light.lamp"]);
  });

  it("groups that contain each other, both listed: one stays", () => {
    const a = entity("light.a", { entity_id: ["light.b"] });
    const b = entity("light.b", { entity_id: ["light.a"] });
    const states = toStates(a, b);
    expect(
      filterGroupsWithListedMembers(["light.a", "light.b"], states)
    ).toEqual(["light.b"]);
  });

  it("groups that contain each other: no infinite loop", () => {
    const a = entity("light.a", { entity_id: ["light.b"] });
    const b = entity("light.b", { entity_id: ["light.a"] });
    const states = toStates(a, b);
    expect(filterGroupsWithListedMembers(["light.a"], states)).toEqual([
      "light.a",
    ]);
  });
});
