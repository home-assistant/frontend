import { assert } from "chai";

import { splitByGroups } from "../../../src/common/entity/split_by_groups";

import { createEntities, createGroup, entityMap } from "./test_util";

describe("splitByGroups", () => {
  it("splitByGroups splits correctly", () => {
    const entities = createEntities(7);
    const entityIds = Object.keys(entities);

    const group1 = createGroup({
      attributes: {
        entity_id: entityIds.splice(0, 2),
        order: 6,
      },
    });
    entities[group1.entity_id] = group1;

    const group2 = createGroup({
      attributes: {
        entity_id: entityIds.splice(0, 3),
        order: 4,
      },
    });
    entities[group2.entity_id] = group2;

    const result = splitByGroups(entities);
    result.groups.sort(
      (gr1, gr2) => gr1.attributes.order - gr2.attributes.order
    );

    const expected = {
      groups: [group2, group1],
      ungrouped: entityMap(entityIds.map((ent) => entities[ent])),
    };

    assert.deepEqual(expected, result);
  });
});
