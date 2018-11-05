import { assert } from "chai";

import featureClassNames from "../../../src/common/entity/feature_class_names";

describe("featureClassNames", () => {
  const classNames = {
    1: "has-feature_a",
    2: "has-feature_b",
    4: "has-feature_c",
    8: "has-feature_d",
  };

  it("Skips null states", () => {
    const stateObj = null;
    assert.strictEqual(featureClassNames(stateObj, classNames), "");
  });

  it("Matches no features", () => {
    const stateObj = {
      attributes: {
        supported_features: 64,
      },
    };
    assert.strictEqual(featureClassNames(stateObj, classNames), "");
  });

  it("Matches one feature", () => {
    const stateObj = {
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
    const stateObj = {
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
