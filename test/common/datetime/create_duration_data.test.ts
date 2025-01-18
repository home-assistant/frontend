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

    expect(createDurationData("20")).toEqual({
      seconds: 20,
    });
  });

  it("should return undefined for invalid string duration", () => {
    expect(createDurationData("1:30:15:20")).toBeUndefined();
  });

  it("should parse number duration correctly", () => {
    expect(createDurationData(3600)).toEqual({ seconds: 3600 });
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
      minutes: undefined,
      seconds: undefined,
      milliseconds: undefined,
    });
  });
});
