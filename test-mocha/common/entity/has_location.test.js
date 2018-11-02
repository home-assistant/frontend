import { assert } from "chai";

import hasLocation from "../../../src/common/entity/has_location";

describe("hasLocation", () => {
  it("flags states with location", () => {
    const stateObj = {
      attributes: {
        latitude: 12.34,
        longitude: 12.34,
      },
    };
    assert(hasLocation(stateObj));
  });
  it("does not flag states with only latitude", () => {
    const stateObj = {
      attributes: {
        latitude: 12.34,
      },
    };
    assert(!hasLocation(stateObj));
  });
  it("does not flag states with only longitude", () => {
    const stateObj = {
      attributes: {
        longitude: 12.34,
      },
    };
    assert(!hasLocation(stateObj));
  });
  it("does not flag states with no location", () => {
    const stateObj = {
      attributes: {},
    };
    assert(!hasLocation(stateObj));
  });
});
