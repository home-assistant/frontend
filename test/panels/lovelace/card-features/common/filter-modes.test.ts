import { assert, describe, it } from "vitest";
import { filterModes } from "../../../../../src/panels/lovelace/card-features/common/filter-modes";

describe("filterModes", () => {
  it("returns all supportedModes when selectedModes is undefined", () => {
    const supportedModes = ["mode1", "mode2", "mode3"];
    const result = filterModes(supportedModes, undefined);
    assert.deepEqual(result, ["mode1", "mode2", "mode3"]);
  });

  it("returns empty array when supportedModes is undefined and selectedModes is undefined", () => {
    const result = filterModes(undefined, undefined);
    assert.deepEqual(result, []);
  });

  it("preserves supportedModes order when filtering with selectedModes", () => {
    const supportedModes = ["heat", "cool", "auto", "off", "dry"];
    const selectedModes = ["off", "heat", "cool"]; // Different order
    const result = filterModes(supportedModes, selectedModes);
    // Result should be in supportedModes order, not selectedModes order
    assert.deepEqual(result, ["heat", "cool", "off"]);
  });

  it("filters out modes not in supportedModes", () => {
    const supportedModes = ["mode1", "mode2", "mode3"];
    const selectedModes = ["mode2", "mode4", "mode1"]; // mode4 not supported
    const result = filterModes(supportedModes, selectedModes);
    assert.deepEqual(result, ["mode1", "mode2"]);
  });

  it("returns empty array when no selectedModes are in supportedModes", () => {
    const supportedModes = ["mode1", "mode2", "mode3"];
    const selectedModes = ["mode4", "mode5"];
    const result = filterModes(supportedModes, selectedModes);
    assert.deepEqual(result, []);
  });

  it("handles empty supportedModes with selectedModes", () => {
    const supportedModes: string[] = [];
    const selectedModes = ["mode1", "mode2"];
    const result = filterModes(supportedModes, selectedModes);
    assert.deepEqual(result, []);
  });

  it("handles empty selectedModes array", () => {
    const supportedModes = ["mode1", "mode2", "mode3"];
    const selectedModes: string[] = [];
    const result = filterModes(supportedModes, selectedModes);
    assert.deepEqual(result, []);
  });

  it("preserves order with climate HVAC modes example", () => {
    // This simulates the real-world use case from hui-climate-hvac-modes-card-feature
    // where modes are ordered by compareClimateHvacModes
    const orderedHvacModes = [
      "heat_cool",
      "heat",
      "cool",
      "dry",
      "fan_only",
      "off",
    ];
    const configHvacModes = ["off", "heat", "cool"]; // User config in different order
    const result = filterModes(orderedHvacModes, configHvacModes);
    // Result should maintain the ordered sequence, not the config order
    assert.deepEqual(result, ["heat", "cool", "off"]);
  });
});
