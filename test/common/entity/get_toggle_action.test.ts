import { assert, describe, it } from "vitest";

import { getToggleAction } from "../../../src/common/entity/get_toggle_action";
import { CoverEntityFeature } from "../../../src/data/cover";

const coverState = (supportedFeatures: number): any => ({
  entity_id: "cover.bla",
  state: "open",
  attributes: { supported_features: supportedFeatures },
});

describe("getToggleAction", () => {
  it("Falls back to the domain when no state is passed", () => {
    assert.equal(getToggleAction("cover", true), "open_cover");
    assert.equal(getToggleAction("cover", false), "close_cover");
    assert.equal(getToggleAction("light", true), "turn_on");
  });

  it("Uses the regular actions for a cover that opens and closes", () => {
    const stateObj = coverState(
      CoverEntityFeature.OPEN +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.CLOSE_TILT
    );
    assert.equal(getToggleAction("cover", true, stateObj), "open_cover");
    assert.equal(getToggleAction("cover", false, stateObj), "close_cover");
  });

  it("Uses the tilt actions for a tilt only cover", () => {
    const stateObj = coverState(
      CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION
    );
    assert.equal(getToggleAction("cover", true, stateObj), "open_cover_tilt");
    assert.equal(getToggleAction("cover", false, stateObj), "close_cover_tilt");
  });

  it("Uses the tilt actions for a tilt cover that also supports stop", () => {
    const stateObj = coverState(
      CoverEntityFeature.STOP +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.CLOSE_TILT
    );
    assert.equal(getToggleAction("cover", true, stateObj), "open_cover_tilt");
    assert.equal(getToggleAction("cover", false, stateObj), "close_cover_tilt");
  });

  it("Keeps the regular actions for a cover without tilt", () => {
    assert.equal(
      getToggleAction("cover", true, coverState(CoverEntityFeature.STOP)),
      "open_cover"
    );
    assert.equal(getToggleAction("cover", false, coverState(0)), "close_cover");
    assert.equal(
      getToggleAction("cover", false, coverState(CoverEntityFeature.OPEN_TILT)),
      "close_cover"
    );
  });

  it("Leaves other domains untouched", () => {
    const stateObj: any = {
      entity_id: "lock.bla",
      state: "locked",
      attributes: {},
    };
    assert.equal(getToggleAction("lock", true, stateObj), "unlock");
    assert.equal(getToggleAction("lock", false, stateObj), "lock");
  });
});
