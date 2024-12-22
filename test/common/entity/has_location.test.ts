import { assert } from "chai";

import { hasLocation } from "../../../src/common/entity/has_location";

describe("hasLocation", () => {
  it("flags states with location", () => {
    const stateObj: any = {
      attributes: {
        latitude: 12.34,
        longitude: 12.34,
      },
    };
    assert(hasLocation(stateObj));
  });
  it("does not flag states with only latitude", () => {
    const stateObj: any = {
      attributes: {
        latitude: 12.34,
      },
    };
    assert(!hasLocation(stateObj));
  });
  it("does not flag states with only longitude", () => {
    const stateObj: any = {
      attributes: {
        longitude: 12.34,
      },
    };
    assert(!hasLocation(stateObj));
  });
  it("does not flag states with no location", () => {
    const stateObj: any = {
      attributes: {},
    };
    assert(!hasLocation(stateObj));
  });
});
