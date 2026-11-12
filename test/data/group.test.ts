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

describe("computeGroupMemberIds", () => {
  it("reads group_entities", () => {
    expect(
      computeGroupMemberIds(
        entity("light.wled", { group_entities: ["light.wled_segment_1"] })
      )
    ).toEqual(["light.wled_segment_1"]);
  });

  it("reads entity_id from group helpers and Hue rooms", () => {
    expect(
      computeGroupMemberIds(
        entity("light.living_room", {
          is_hue_group: true,
          entity_id: ["light.lamp"],
        })
      )
    ).toEqual(["light.lamp"]);
  });

  it("returns undefined for a single light", () => {
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

  it("drops groups whose members are listed", () => {
    const states = toStates(lamp, ceiling, helperGroup, hueRoom);
    expect(filterGroupsWithListedMembers(Object.keys(states), states)).toEqual([
      "light.lamp",
      "light.ceiling",
    ]);
  });

  it("drops a group of groups", () => {
    const house = entity("light.house", {
      entity_id: ["light.downstairs"],
    });
    const states = toStates(lamp, ceiling, helperGroup, house);
    expect(filterGroupsWithListedMembers(Object.keys(states), states)).toEqual([
      "light.lamp",
      "light.ceiling",
    ]);
  });

  it("keeps a group when none of its members are listed", () => {
    // e.g. the members are hidden, or a Hue room's bulbs are disabled
    const states = toStates(lamp, ceiling, helperGroup);
    expect(filterGroupsWithListedMembers(["light.downstairs"], states)).toEqual(
      ["light.downstairs"]
    );
  });
});
