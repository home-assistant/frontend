import { assert, describe, it } from "vitest";

import { getToggleAction } from "../../../src/common/entity/get_toggle_action";
import { CoverEntityFeature } from "../../../src/data/feature/cover_entity_feature";

describe("getToggleAction", () => {
  it("Uses turn_on/turn_off for default domains", () => {
    assert.strictEqual(getToggleAction("light", true), "turn_on");
    assert.strictEqual(getToggleAction("light", false), "turn_off");
  });

  it("Uses open_cover/close_cover for covers without a state object", () => {
    assert.strictEqual(getToggleAction("cover", true), "open_cover");
    assert.strictEqual(getToggleAction("cover", false), "close_cover");
  });

  it("Uses open_cover/close_cover for covers supporting open/close", () => {
    const stateObj: any = {
      entity_id: "cover.bla",
      attributes: {
        supported_features:
          CoverEntityFeature.OPEN +
          CoverEntityFeature.CLOSE +
          CoverEntityFeature.OPEN_TILT +
          CoverEntityFeature.CLOSE_TILT,
      },
    };
    assert.strictEqual(getToggleAction("cover", true, stateObj), "open_cover");
    assert.strictEqual(
      getToggleAction("cover", false, stateObj),
      "close_cover"
    );
  });

  it("Uses tilt services for tilt-only covers with a known state", () => {
    const stateObj: any = {
      entity_id: "cover.bla",
      state: "open",
      attributes: {
        supported_features:
          CoverEntityFeature.OPEN_TILT +
          CoverEntityFeature.CLOSE_TILT +
          CoverEntityFeature.SET_TILT_POSITION,
      },
    };
    assert.strictEqual(
      getToggleAction("cover", true, stateObj),
      "open_cover_tilt"
    );
    assert.strictEqual(
      getToggleAction("cover", false, stateObj),
      "close_cover_tilt"
    );
  });

  it("Uses toggle_cover_tilt for tilt-only covers with an unknown state", () => {
    const stateObj: any = {
      entity_id: "cover.bla",
      state: "unknown",
      attributes: {
        supported_features:
          CoverEntityFeature.OPEN_TILT +
          CoverEntityFeature.CLOSE_TILT +
          CoverEntityFeature.SET_TILT_POSITION,
      },
    };
    assert.strictEqual(
      getToggleAction("cover", true, stateObj),
      "toggle_cover_tilt"
    );
    assert.strictEqual(
      getToggleAction("cover", false, stateObj),
      "toggle_cover_tilt"
    );
  });
});
