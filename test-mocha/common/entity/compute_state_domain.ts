import { assert } from "chai";

import { computeStateDomain } from "../../../src/common/entity/compute_state_domain";

describe("computeStateDomain", () => {
  it("Detects sensor domain", () => {
    const stateObj: any = {
      entity_id: "sensor.test",
    };
    assert.strictEqual(computeStateDomain(stateObj), "sensor");
  });
});
