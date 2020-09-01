import * as assert from "assert";
import {
  getValueInPercentage,
  normalize,
  roundWithOneDecimal,
} from "../../src/util/calculate";

describe("Calculate tests", function () {
  it("Test getValueInPercentage", function () {
    assert.equal(getValueInPercentage(10, 0, 100), 10);
    assert.equal(getValueInPercentage(120, 0, 100), 120);
    assert.equal(getValueInPercentage(-10, 0, 100), -10);
    assert.equal(getValueInPercentage(10.33333, 0, 100), 10.33333);
  });
  it("Test normalize", function () {
    assert.equal(normalize(10, 0, 100), 10);
    assert.equal(normalize(1, 10, 100), 10);
    assert.equal(normalize(100, 0, 10), 10);
  });
  it("Test roundWithOneDecimal", function () {
    assert.equal(roundWithOneDecimal(10), 10);
    assert.equal(roundWithOneDecimal(10.3), 10.3);
    assert.equal(roundWithOneDecimal(10.3333), 10.3);
  });
});
