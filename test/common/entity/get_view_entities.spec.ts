import { assert } from "chai";

import { getViewEntities } from "../../../src/common/entity/get_view_entities";

import {
  createEntities,
  createGroup,
  createView,
  entityMap,
} from "./test_util";

describe("getViewEntities", () => {
  it("should work", () => {
    const entities = createEntities(10);
    const entityIds = Object.keys(entities);

    const group1 = createGroup({
      attributes: { entity_id: entityIds.splice(0, 2) },
    });
    entities[group1.entity_id] = group1;

    const group2 = createGroup({
      attributes: { entity_id: entityIds.splice(0, 3) },
    });
    entities[group2.entity_id] = group2;

    const view = createView({
      attributes: {
        entity_id: [group1.entity_id, group2.entity_id].concat(
          entityIds.splice(0, 2)
        ),
      },
    });

    const expectedEntities = entityMap(
      view.attributes.entity_id.map((ent) => entities[ent])
    );
    Object.assign(
      expectedEntities,
      entityMap(group1.attributes.entity_id.map((ent) => entities[ent]))
    );
    Object.assign(
      expectedEntities,
      entityMap(group2.attributes.entity_id.map((ent) => entities[ent]))
    );

    assert.deepEqual(expectedEntities, getViewEntities(entities, view));
  });
});
