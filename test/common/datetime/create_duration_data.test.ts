import { describe, it, expect } from "vitest";
import { createDurationData } from "../../../src/common/datetime/create_duration_data";

describe("createDurationData", () => {
  it("should return undefined for undefined input", () => {
    expect(createDurationData(undefined)).toBeUndefined();
  });

  it("should parse string duration correctly", () => {
    expect(createDurationData("1:30:15.001")).toEqual({
      hours: 1,
      minutes: 30,
      seconds: 15,
      milliseconds: 1,
    });

    expect(createDurationData("1:30:15.001", false, false)).toEqual({
      hours: 1,
      minutes: 30,
      seconds: 15.001,
    });

    expect(createDurationData("20")).toEqual({
      seconds: 20,
    });

    expect(createDurationData("3:00", false, false)).toEqual({
      hours: 3,
      minutes: 0,
      seconds: 0,
    });
  });

  it("should parse string negative duration correctly", () => {
    expect(createDurationData("-1:30:15.001", true, true, true)).toEqual({
      hours: -1,
      minutes: -30,
      seconds: -15,
      milliseconds: -1,
    });

    expect(createDurationData("-1:30:15.001", true, false, true)).toEqual({
      hours: -1,
      minutes: -30,
      seconds: -15.001,
    });

    expect(createDurationData("-1:30:15.001", true, true, false)).toEqual({
      hours: -1,
      minutes: 30,
      seconds: 15,
      milliseconds: 1,
    });

    expect(createDurationData("-1:30:15.001", true, false, false)).toEqual({
      hours: -1,
      minutes: 30,
      seconds: 15.001,
    });

    expect(createDurationData("-20")).toEqual({
      seconds: -20,
    });
  });

  it("should return undefined for invalid string duration", () => {
    expect(createDurationData("1:30:15:20")).toBeUndefined();
  });

  it("should parse number duration correctly", () => {
    expect(createDurationData(3600)).toEqual({ seconds: 3600 });
  });

  it("should parse decimal seconds correctly", () => {
    expect(createDurationData(0.5)).toEqual({ seconds: 0.5 });
    expect(createDurationData(0.2)).toEqual({ seconds: 0.2 });
    expect(createDurationData(1.25)).toEqual({ seconds: 1.25 });
  });

  it("should parse object duration without days correctly", () => {
    expect(createDurationData({ hours: 1, minutes: 30 })).toEqual({
      hours: 1,
      minutes: 30,
    });
  });

  it("should handle days in object duration correctly", () => {
    expect(createDurationData({ days: 1, hours: 1 })).toEqual({
      hours: 25,
    });
  });
  it("should handle days in object duration correctly, when enableDay is true", () => {
    const d = { days: 1, hours: 1 };
    expect(createDurationData(d, true)).toEqual(d);
  });
});
