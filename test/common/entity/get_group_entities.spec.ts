import { assert } from "chai";

import { getGroupEntities } from "../../../src/common/entity/get_group_entities";

import { createEntities, createGroup, entityMap } from "./test_util";

describe("getGroupEntities", () => {
  it("works if all entities exist", () => {
    const entities = createEntities(5);
    const entityIds = Object.keys(entities);

    const group = createGroup({
      attributes: { entity_id: entityIds.splice(0, 2) },
    });

    const groupEntities = entityMap(
      group.attributes.entity_id.map((ent) => entities[ent])
    );
    assert.deepEqual(groupEntities, getGroupEntities(entities, group));
  });

  it("works if one entity doesn't exist", () => {
    const entities = createEntities(5);
    const entityIds = Object.keys(entities);

    const groupEntities = entityMap([
      entities[entityIds[0]],
      entities[entityIds[1]],
    ]);

    const group = createGroup({
      attributes: {
        entity_id: entityIds.splice(0, 2).concat("light.does_not_exist"),
      },
    });

    assert.deepEqual(groupEntities, getGroupEntities(entities, group));
  });
});
