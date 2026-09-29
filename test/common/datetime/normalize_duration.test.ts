import { describe, expect, it } from "vitest";
import {
  applyDurationSign,
  normalizeDuration,
} from "../../../src/common/datetime/normalize_duration";

describe("normalizeDuration", () => {
  it("splits the sign from the components", () => {
    expect(normalizeDuration({ hours: -1, minutes: -30 })).toEqual({
      negative: true,
      days: 0,
      hours: 1,
      minutes: 30,
      seconds: 0,
      milliseconds: 0,
    });
  });

  it("uses the total when components have mixed signs", () => {
    expect(normalizeDuration({ hours: 1, minutes: -30 })).toMatchObject({
      negative: false,
      hours: 0,
      minutes: 30,
    });
  });

  it("folds units that are not shown into the smaller ones", () => {
    expect(
      normalizeDuration(
        { days: 1, hours: 2, seconds: 5, milliseconds: 500 },
        { enableDay: false, enableMillisecond: false }
      )
    ).toEqual({ negative: false, hours: 26, minutes: 0, seconds: 5.5 });
  });

  it("leaves out zero seconds when seconds are not shown", () => {
    expect(
      normalizeDuration(
        { hours: 1 },
        { enableDay: false, enableSecond: false, enableMillisecond: false }
      )
    ).toEqual({ negative: false, hours: 1, minutes: 0 });
  });
});

describe("applyDurationSign", () => {
  it("negates non zero components only when negative", () => {
    expect(
      applyDurationSign({ hours: 1, minutes: 30, seconds: 0 }, true)
    ).toEqual({ hours: -1, minutes: -30, seconds: 0 });
    expect(applyDurationSign({ hours: 1 }, false)).toEqual({ hours: 1 });
  });
});
