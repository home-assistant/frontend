import { describe, expect, it } from "vitest";
import type { FanEntity } from "../../src/data/fan";
import {
  computeFanSpeedIcon,
  computeFanSpeeds,
  fanPercentageToSpeed,
  fanSpeedToPercentage,
} from "../../src/data/fan";

const fan = (percentage_step?: number): FanEntity =>
  ({
    entity_id: "fan.test",
    state: "on",
    attributes: { percentage_step },
  }) as FanEntity;

describe("computeFanSpeeds", () => {
  it("uses named speeds when icons exist for every step", () => {
    expect(computeFanSpeeds(fan(100))).toEqual(["off", "on"]);
    expect(computeFanSpeeds(fan(50))).toEqual(["off", "low", "high"]);
    expect(computeFanSpeeds(fan(100 / 3))).toEqual([
      "off",
      "low",
      "medium",
      "high",
    ]);
  });

  it("uses numbered speeds for fans with more steps", () => {
    expect(computeFanSpeeds(fan(25))).toEqual(["off", "1", "2", "3", "4"]);
    expect(computeFanSpeeds(fan(20))).toEqual(["off", "1", "2", "3", "4", "5"]);
  });

  it("returns undefined when there are too many steps for buttons", () => {
    expect(computeFanSpeeds(fan(100 / 6))).toBeUndefined();
    expect(computeFanSpeeds(fan())).toBeUndefined();
  });
});

describe("fan speed and percentage conversion", () => {
  it("round-trips named speeds", () => {
    const stateObj = fan(100 / 3);
    expect(fanPercentageToSpeed(stateObj, 67)).toBe("medium");
    expect(fanSpeedToPercentage(stateObj, "medium")).toBe(66);
    expect(fanPercentageToSpeed(stateObj, 66)).toBe("medium");
  });

  it("round-trips numbered speeds", () => {
    const stateObj = fan(25);
    expect(fanPercentageToSpeed(stateObj, 0)).toBe("off");
    expect(fanPercentageToSpeed(stateObj, 75)).toBe("3");
    expect(fanSpeedToPercentage(stateObj, "4")).toBe(100);
  });
});

describe("computeFanSpeedIcon", () => {
  it("has icons for named speeds but not numbered ones", () => {
    expect(computeFanSpeedIcon(fan(100 / 3), "high")).toBeTypeOf("string");
    expect(computeFanSpeedIcon(fan(25), "off")).toBeTypeOf("string");
    expect(computeFanSpeedIcon(fan(25), "2")).toBeUndefined();
  });
});
