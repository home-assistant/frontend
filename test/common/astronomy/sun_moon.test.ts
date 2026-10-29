import { describe, expect, it } from "vitest";
import {
  getMoonIllumination,
  getNextFullMoon,
  getSunEvents,
  getSunTimes,
  moonPhaseName,
} from "../../../src/common/astronomy/sun_moon";

// Utrecht, the Netherlands
const LATITUDE = 52.09;
const LONGITUDE = 5.12;

const MINUTE_MS = 60000;

const expectClose = (actual: Date | undefined, expected: string) => {
  expect(actual).toBeDefined();
  expect(
    Math.abs(actual!.getTime() - new Date(expected).getTime())
  ).toBeLessThan(3 * MINUTE_MS);
};

describe("getSunTimes", () => {
  it("finds sunrise and sunset", () => {
    const { rise, set } = getSunTimes(
      new Date("2026-10-18T12:00:00+02:00"),
      LATITUDE,
      LONGITUDE
    );
    expectClose(rise, "2026-10-18T08:09:00+02:00");
    expectClose(set, "2026-10-18T18:40:00+02:00");
  });

  it("has no sunrise during the polar night", () => {
    const { rise, set } = getSunTimes(
      new Date("2026-12-21T12:00:00Z"),
      78.22,
      15.65
    );
    expect(rise).toBeUndefined();
    expect(set).toBeUndefined();
  });
});

describe("getSunEvents", () => {
  it("lists sunrises and sunsets in order", () => {
    const events = getSunEvents(
      new Date("2026-10-18T12:00:00+02:00"),
      new Date("2026-10-19T12:00:00+02:00"),
      LATITUDE,
      LONGITUDE
    );
    expect(events.map((event) => event.type)).toEqual(["sunset", "sunrise"]);
  });
});

describe("moon", () => {
  it("knows the first quarter of October 2026", () => {
    const illumination = getMoonIllumination(new Date("2026-10-18T12:00:00Z"));
    expect(illumination.fraction).toBeGreaterThan(0.4);
    expect(illumination.fraction).toBeLessThan(0.6);
    expect(moonPhaseName(illumination.phase)).toBe("first_quarter");
  });

  it("finds the next full moon", () => {
    const fullMoon = getNextFullMoon(new Date("2026-10-18T12:00:00Z"));
    // The full moon is on 26 October 2026, around 04:12 UTC
    expect(
      Math.abs(fullMoon.getTime() - Date.parse("2026-10-26T04:12:00Z"))
    ).toBeLessThan(12 * 60 * MINUTE_MS);
  });

  it("names phases like the moon integration", () => {
    expect(moonPhaseName(0)).toBe("new_moon");
    expect(moonPhaseName(0.1)).toBe("waxing_crescent");
    expect(moonPhaseName(0.5)).toBe("full_moon");
    expect(moonPhaseName(0.75)).toBe("last_quarter");
    expect(moonPhaseName(0.9)).toBe("waning_crescent");
  });
});
