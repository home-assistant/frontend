import { assert, describe, it } from "vitest";

import { normalizeValueBySIPrefix } from "../../../src/common/number/normalize-by-si-prefix";

describe("normalizeValueBySIPrefix", () => {
  it("Applies kilo prefix (k)", () => {
    assert.equal(normalizeValueBySIPrefix(11, "kW"), 11000);
    assert.equal(normalizeValueBySIPrefix(2.5, "kWh"), 2500);
  });

  it("Applies mega prefix (M)", () => {
    assert.equal(normalizeValueBySIPrefix(3, "MW"), 3_000_000);
  });

  it("Applies giga prefix (G)", () => {
    assert.equal(normalizeValueBySIPrefix(1, "GW"), 1_000_000_000);
  });

  it("Applies tera prefix (T)", () => {
    assert.equal(normalizeValueBySIPrefix(2, "TW"), 2_000_000_000_000);
  });

  it("Applies milli prefix (m)", () => {
    assert.equal(normalizeValueBySIPrefix(500, "mW"), 0.5);
  });

  it("Applies micro prefix (µ micro sign U+00B5)", () => {
    assert.equal(normalizeValueBySIPrefix(1000, "\u00B5W"), 0.001);
  });

  it("Applies micro prefix (μ greek mu U+03BC)", () => {
    assert.equal(normalizeValueBySIPrefix(1000, "\u03BCW"), 0.001);
  });

  it("Returns value unchanged for single-char units", () => {
    assert.equal(normalizeValueBySIPrefix(100, "W"), 100);
    assert.equal(normalizeValueBySIPrefix(5, "m"), 5);
    assert.equal(normalizeValueBySIPrefix(22, "K"), 22);
  });

  it("Returns value unchanged for undefined unit", () => {
    assert.equal(normalizeValueBySIPrefix(42, undefined), 42);
  });

  it("Returns value unchanged for unrecognized prefixes", () => {
    assert.equal(normalizeValueBySIPrefix(20, "°C"), 20);
    assert.equal(normalizeValueBySIPrefix(50, "dB"), 50);
    assert.equal(normalizeValueBySIPrefix(1013, "hPa"), 1013);
  });

  it("Returns value unchanged for empty string", () => {
    assert.equal(normalizeValueBySIPrefix(10, ""), 10);
  });
});
