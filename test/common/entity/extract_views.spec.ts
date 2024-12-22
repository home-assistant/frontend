import { assert } from "chai";
import { DEFAULT_VIEW_ENTITY_ID } from "../../../src/common/const";
import { extractViews } from "../../../src/common/entity/extract_views";
import { createEntities, createView } from "./test_util";

describe("extractViews", () => {
  it("should work", () => {
    const entities = createEntities(10);
    const view1 = createView({ attributes: { order: 10 } });
    entities[view1.entity_id] = view1;

    const view2 = createView({ attributes: { order: 2 } });
    entities[view2.entity_id] = view2;

    const view3 = createView({
      entity_id: DEFAULT_VIEW_ENTITY_ID,
      attributes: { order: 8 },
    });
    entities[view3.entity_id] = view3;

    const view4 = createView({ attributes: { order: 4 } });
    entities[view4.entity_id] = view4;

    const expected = [view3, view2, view4, view1];

    assert.deepEqual(expected, extractViews(entities));
  });
});
