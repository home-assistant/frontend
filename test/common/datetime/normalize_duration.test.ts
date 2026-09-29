import { describe, expect, it } from "vitest";
import {
  applyDurationSign,
  normalizeDuration,
} from "../../../src/common/datetime/normalize_duration";

describe("normalizeDuration", () => {
  it("derives the sign from components sharing a sign", () => {
    expect(normalizeDuration({ hours: -1, minutes: -30 })).toEqual({
      negative: true,
      hours: 1,
      minutes: 30,
    });
    expect(normalizeDuration({ hours: 0, minutes: 0 })).toEqual({
      negative: false,
      hours: 0,
      minutes: 0,
    });
  });

  it("splits the total again when components have mixed signs", () => {
    expect(normalizeDuration({ hours: 1, minutes: -30, seconds: 0 })).toEqual({
      negative: false,
      hours: 0,
      minutes: 30,
      seconds: 0,
    });
    expect(normalizeDuration({ days: -1, hours: 2, milliseconds: 0 })).toEqual({
      negative: true,
      days: 0,
      hours: 22,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });
  });
});

describe("applyDurationSign", () => {
  it("negates non zero components only when negative", () => {
    expect(
      applyDurationSign({ hours: 1, minutes: 30, seconds: 0 }, true)
    ).toEqual({ hours: -1, minutes: -30, seconds: 0 });
    expect(applyDurationSign({ hours: 1, minutes: 30 }, false)).toEqual({
      hours: 1,
      minutes: 30,
    });
  });
});
