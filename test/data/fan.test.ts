import { describe, expect, it } from "vitest";
import type { FanEntity } from "../../src/data/fan";
import {
  computeDefaultFanSpeedStyle,
  computeFanSpeedButtonsMinWidth,
  computeFanSpeedIcon,
  computeFanSpeeds,
  fanPercentageToSpeed,
  fanSpeedToPercentage,
  resolveFanSpeedStyle,
  supportsFanSpeedStyleChoice,
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
    expect(computeFanSpeeds(fan(100 / 6))).toEqual([
      "off",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(computeFanSpeeds(fan(10))).toHaveLength(11);
    expect(computeFanSpeeds(fan(10))?.[10]).toBe("10");
  });

  it("returns undefined when there are too many steps for buttons", () => {
    expect(computeFanSpeeds(fan(100 / 11))).toBeUndefined();
    expect(computeFanSpeeds(fan())).toBeUndefined();
  });
});

describe("fan speed style", () => {
  it("defaults to buttons up to 6 speeds and to a slider above", () => {
    expect(computeDefaultFanSpeedStyle(fan(20))).toBe("buttons");
    expect(computeDefaultFanSpeedStyle(fan(100 / 6))).toBe("slider");
  });

  it("resolves the requested style", () => {
    expect(resolveFanSpeedStyle(fan(20))).toBe("buttons");
    expect(resolveFanSpeedStyle(fan(100 / 6))).toBe("slider");
    expect(resolveFanSpeedStyle(fan(20), "slider")).toBe("slider");
    expect(resolveFanSpeedStyle(fan(100 / 6), "buttons")).toBe("buttons");
    expect(resolveFanSpeedStyle(fan(10), "buttons")).toBe("buttons");
  });

  it("falls back to a slider when there are too many speeds for buttons", () => {
    expect(resolveFanSpeedStyle(fan(100 / 11), "buttons")).toBe("slider");
    expect(resolveFanSpeedStyle(fan(), "buttons")).toBe("slider");
  });

  it("keeps buttons for an off/on fan", () => {
    expect(resolveFanSpeedStyle(fan(100))).toBe("buttons");
    expect(resolveFanSpeedStyle(fan(100), "slider")).toBe("buttons");
  });

  it("offers a choice from 3 to 11 speeds", () => {
    expect(supportsFanSpeedStyleChoice(fan(100))).toBe(false);
    expect(supportsFanSpeedStyleChoice(fan(50))).toBe(true);
    expect(supportsFanSpeedStyleChoice(fan(10))).toBe(true);
    expect(supportsFanSpeedStyleChoice(fan(100 / 11))).toBe(false);
  });
});

describe("computeFanSpeedButtonsMinWidth", () => {
  const minWidth = (step: number) =>
    computeFanSpeedButtonsMinWidth(computeFanSpeeds(fan(step))!);

  it("needs 24px per button", () => {
    expect(minWidth(100 / 6)).toBe(7 * 24);
    expect(minWidth(10)).toBe(11 * 24);
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

  it.each([100 / 6, 100 / 7, 10])(
    "round-trips every speed with a step of %s",
    (step) => {
      const stateObj = fan(step);
      for (const speed of computeFanSpeeds(stateObj)!) {
        const percentage = fanSpeedToPercentage(stateObj, speed);
        expect(fanPercentageToSpeed(stateObj, percentage)).toBe(speed);
      }
    }
  );
});

describe("computeFanSpeedIcon", () => {
  it("has icons for named speeds but not numbered ones", () => {
    expect(computeFanSpeedIcon(fan(100 / 3), "high")).toBeTypeOf("string");
    expect(computeFanSpeedIcon(fan(25), "off")).toBeTypeOf("string");
    expect(computeFanSpeedIcon(fan(25), "2")).toBeUndefined();
  });
});
