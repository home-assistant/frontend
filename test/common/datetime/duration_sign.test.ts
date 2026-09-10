import { describe, expect, it } from "vitest";
import {
  absDurationData,
  isNegativeDuration,
  isValidDurationData,
  signedDurationToSeconds,
} from "../../../src/common/datetime/duration_sign";

describe("isNegativeDuration", () => {
  it("uses the negative flag when present", () => {
    expect(isNegativeDuration({ negative: true, hours: 1 })).toBe(true);
    expect(isNegativeDuration({ negative: false, hours: 1 })).toBe(false);
  });

  it("falls back to the sign of the total for legacy components", () => {
    expect(isNegativeDuration({ hours: -1 })).toBe(true);
    expect(isNegativeDuration({ hours: -1, minutes: 30 })).toBe(true);
    expect(isNegativeDuration({ hours: -1, minutes: 90 })).toBe(false);
    expect(isNegativeDuration({ hours: 0, minutes: 0 })).toBe(false);
  });
});

describe("absDurationData", () => {
  it("strips the flag and keeps the components", () => {
    expect(absDurationData({ negative: true, hours: 1, minutes: 30 })).toEqual({
      hours: 1,
      minutes: 30,
    });
  });

  it("keeps the breakdown of legacy components sharing a sign", () => {
    expect(absDurationData({ hours: -1, minutes: -30 })).toEqual({
      hours: 1,
      minutes: 30,
    });
  });

  it("recomputes the breakdown from the total for mixed signs", () => {
    expect(absDurationData({ hours: -1, minutes: 30 })).toEqual({
      hours: 0,
      minutes: 30,
      seconds: 0,
    });
    expect(absDurationData({ days: 1, hours: -2, milliseconds: 500 })).toEqual({
      days: 0,
      hours: 22,
      minutes: 0,
      seconds: 0,
      milliseconds: 500,
    });
  });
});

describe("signedDurationToSeconds", () => {
  it("applies the flag to positive components", () => {
    expect(signedDurationToSeconds({ negative: true, minutes: 30 })).toBe(
      -1800
    );
    expect(signedDurationToSeconds({ negative: false, minutes: 30 })).toBe(
      1800
    );
  });

  it("sums legacy signed components", () => {
    expect(signedDurationToSeconds({ hours: -1, minutes: 30 })).toBe(-1800);
  });
});

describe("isValidDurationData", () => {
  it("rejects non finite components", () => {
    expect(isValidDurationData({ hours: 1, minutes: NaN })).toBe(false);
    expect(isValidDurationData({ hours: 1 })).toBe(true);
  });
});
