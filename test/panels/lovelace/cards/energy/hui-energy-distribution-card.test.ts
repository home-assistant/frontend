import { assert, describe, it } from "vitest";

import {
  FLOW_EPSILON,
  MAX_FLOW_DURATION,
  MIN_FLOW_DURATION,
  flowDuration,
  hasFlow,
} from "../../../../../src/panels/lovelace/cards/energy/hui-energy-distribution-card";

describe("flowDuration", () => {
  it("returns MIN_FLOW_DURATION when a flow is the only one", () => {
    // A full feed-in setup has solar->grid as its sole flow every day, so the
    // share is exactly 1. This used to evaluate to 0s, which is not a valid
    // SMIL duration and left the dot frozen instead of animating.
    assert.strictEqual(flowDuration(35.18, 35.18), MIN_FLOW_DURATION);
  });

  it("approaches MAX_FLOW_DURATION as a flow's share approaches zero", () => {
    assert.strictEqual(flowDuration(0, 100), MAX_FLOW_DURATION);
    assert.closeTo(flowDuration(0.001, 100), MAX_FLOW_DURATION, 0.001);
  });

  it("stays within the duration bounds across the whole share range", () => {
    for (let share = 0; share <= 1; share += 0.01) {
      const duration = flowDuration(share, 1);
      assert.isAtLeast(duration, MIN_FLOW_DURATION);
      assert.isAtMost(duration, MAX_FLOW_DURATION);
    }
  });

  it("makes a larger share faster than a smaller one", () => {
    assert.isBelow(flowDuration(90, 100), flowDuration(10, 100));
  });
});

describe("hasFlow", () => {
  it("rejects float residue left by summing statistics", () => {
    // Measured on a full feed-in instance where solar and export cancel out:
    // used_solar accumulated to this instead of a clean 0, which is truthy and
    // drew a phantom solar->home dot for energy displayed as "0 kWh".
    assert.isFalse(hasFlow(4.334310688136611e-13));
    assert.isFalse(hasFlow(7.105427357601002e-15));
  });

  it("rejects absent and zero flows", () => {
    assert.isFalse(hasFlow(null));
    assert.isFalse(hasFlow(undefined));
    assert.isFalse(hasFlow(0));
  });

  it("accepts real flows", () => {
    assert.isTrue(hasFlow(0.5));
    assert.isTrue(hasFlow(35.18));
  });

  it("treats FLOW_EPSILON itself as no flow", () => {
    assert.isFalse(hasFlow(FLOW_EPSILON));
    assert.isTrue(hasFlow(FLOW_EPSILON * 2));
  });
});
