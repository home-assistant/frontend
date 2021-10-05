import { assert } from "chai";
import { attributeClassNames } from "../../../src/common/entity/attribute_class_names";

describe("attributeClassNames", () => {
  const attrs = ["mock_attr1", "mock_attr2"];

  it("Skips null states", () => {
    const stateObj: any = null;
    assert.strictEqual(attributeClassNames(stateObj, attrs), "");
  });

  it("Matches no attrbutes", () => {
    const stateObj: any = {
      attributes: {
        other_attr_1: 1,
        other_attr_2: 2,
      },
    };
    assert.strictEqual(attributeClassNames(stateObj, attrs), "");
  });

  it("Matches one attrbute", () => {
    const stateObj: any = {
      attributes: {
        other_attr_1: 1,
        other_attr_2: 2,
        mock_attr1: 3,
      },
    };
    assert.strictEqual(attributeClassNames(stateObj, attrs), "has-mock_attr1");
  });

  it("Matches two attrbutes", () => {
    const stateObj: any = {
      attributes: {
        other_attr_1: 1,
        other_attr_2: 2,
        mock_attr1: 3,
        mock_attr2: null,
      },
    };
    assert.strictEqual(
      attributeClassNames(stateObj, attrs),
      "has-mock_attr1 has-mock_attr2"
    );
  });
});
