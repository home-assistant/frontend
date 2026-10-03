import { assert, describe, it } from "vitest";

import { parseAnimationDuration } from "../../../src/common/util/parse-animation-duration";

describe("parseAnimationDuration", () => {
  it("Parses milliseconds with unit", () => {
    assert.equal(parseAnimationDuration("300ms"), 300);
  });

  it("Parses seconds with unit", () => {
    assert.equal(parseAnimationDuration("3s"), 3000);
  });

  it("Parses decimal seconds", () => {
    assert.equal(parseAnimationDuration("0.5s"), 500);
  });

  it("Parses decimal milliseconds", () => {
    assert.equal(parseAnimationDuration("250.5ms"), 250.5);
  });

  it("Handles whitespace", () => {
    assert.equal(parseAnimationDuration("  300ms  "), 300);
    assert.equal(parseAnimationDuration("  3s  "), 3000);
  });

  it("Handles number without unit as milliseconds", () => {
    assert.equal(parseAnimationDuration("300"), 300);
  });

  it("Returns 0 for invalid input", () => {
    assert.equal(parseAnimationDuration("invalid"), 0);
  });

  it("Returns 0 for empty string", () => {
    assert.equal(parseAnimationDuration(""), 0);
  });

  it("Returns 0 for negative values", () => {
    assert.equal(parseAnimationDuration("-300ms"), 0);
    assert.equal(parseAnimationDuration("-3s"), 0);
  });

  it("Returns 0 for NaN", () => {
    assert.equal(parseAnimationDuration("NaN"), 0);
  });

  it("Returns 0 for Infinity", () => {
    assert.equal(parseAnimationDuration("Infinity"), 0);
  });

  it("Handles zero values", () => {
    assert.equal(parseAnimationDuration("0ms"), 0);
    assert.equal(parseAnimationDuration("0s"), 0);
  });
});
