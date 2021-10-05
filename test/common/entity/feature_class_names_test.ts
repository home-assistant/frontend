import { assert } from "chai";

import { featureClassNames } from "../../../src/common/entity/feature_class_names";
import { HassEntity } from "home-assistant-js-websocket";

describe("featureClassNames", () => {
  const classNames = {
    1: "has-feature_a",
    2: "has-feature_b",
    4: "has-feature_c",
    8: "has-feature_d",
  };

  it("Skips null states", () => {
    const stateObj = null;
    assert.strictEqual(featureClassNames(stateObj!, classNames), "");
  });

  it("Matches no features", () => {
    // eslint-disable-next-line
    const stateObj = <HassEntity>{
      attributes: {
        supported_features: 64,
      },
    };
    assert.strictEqual(featureClassNames(stateObj, classNames), "");
  });

  it("Matches one feature", () => {
    // eslint-disable-next-line
    const stateObj = <HassEntity>{
      attributes: {
        supported_features: 72,
      },
    };
    assert.strictEqual(
      featureClassNames(stateObj, classNames),
      "has-feature_d"
    );
  });

  it("Matches two features", () => {
    // eslint-disable-next-line
    const stateObj = <HassEntity>{
      attributes: {
        supported_features: 73,
      },
    };
    assert.strictEqual(
      featureClassNames(stateObj, classNames),
      "has-feature_a has-feature_d"
    );
  });
});
