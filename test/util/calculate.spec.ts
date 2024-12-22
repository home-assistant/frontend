import { assert } from "chai";
import {
  getValueInPercentage,
  normalize,
  roundWithOneDecimal,
} from "../../src/util/calculate";

describe("Calculate tests", function () {
  it("Test getValueInPercentage", function () {
    assert.strictEqual(getValueInPercentage(10, 0, 100), 10);
    assert.strictEqual(getValueInPercentage(120, 0, 100), 120);
    assert.strictEqual(getValueInPercentage(-10, 0, 100), -10);
    assert.strictEqual(getValueInPercentage(10.33333, 0, 100), 10.33333);
  });
  it("Test normalize", function () {
    assert.strictEqual(normalize(10, 0, 100), 10);
    assert.strictEqual(normalize(1, 10, 100), 10);
    assert.strictEqual(normalize(100, 0, 10), 10);
  });
  it("Test roundWithOneDecimal", function () {
    assert.strictEqual(roundWithOneDecimal(10), 10);
    assert.strictEqual(roundWithOneDecimal(10.3), 10.3);
    assert.strictEqual(roundWithOneDecimal(10.3333), 10.3);
  });
});
