import { assert } from "chai";

import { computeDomain } from "../../../src/common/entity/compute_domain";

describe("computeDomain", () => {
  it("Returns domains", () => {
    assert.equal(computeDomain("sensor.bla"), "sensor");
    assert.equal(computeDomain("switch.bla"), "switch");
    assert.equal(computeDomain("light.bla"), "light");
    assert.equal(
      computeDomain("persistent_notification.bla"),
      "persistent_notification"
    );
  });
});
