import { describe, expect, it } from "vitest";
import { durationValueToData } from "../../../src/common/datetime/duration_value_to_data";

describe("durationValueToData", () => {
  it("converts numbers to seconds with a flag when negative", () => {
    expect(durationValueToData(90)).toEqual({ seconds: 90 });
    expect(durationValueToData(-90)).toEqual({ negative: true, seconds: 90 });
  });

  it("parses colon separated strings", () => {
    expect(durationValueToData("90")).toEqual({ seconds: 90 });
    expect(durationValueToData("1:30")).toEqual({ hours: 1, minutes: 30 });
    expect(durationValueToData("01:30:15")).toEqual({
      hours: 1,
      minutes: 30,
      seconds: 15,
    });
    expect(durationValueToData("1:2:3:4")).toBeUndefined();
  });

  it("moves a leading minus of a string into the flag", () => {
    expect(durationValueToData("-03:00:00")).toEqual({
      negative: true,
      hours: 3,
      minutes: 0,
      seconds: 0,
    });
    expect(durationValueToData(" -60")).toEqual({
      negative: true,
      seconds: 60,
    });
  });

  it("passes dicts through untouched", () => {
    const value = { negative: true, hours: 1 };
    expect(durationValueToData(value)).toBe(value);
    expect(durationValueToData(undefined)).toBeUndefined();
  });
});
