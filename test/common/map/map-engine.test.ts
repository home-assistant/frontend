import { describe, expect, it } from "vitest";
import { pixelDistance } from "../../../src/common/map/map-engine";

describe("pixelDistance", () => {
  it("spans half the 256px world at zoom 0", () => {
    expect(pixelDistance([0, -90], [0, 90], 0)).toBeCloseTo(128);
  });

  it("takes the short way across the antimeridian", () => {
    expect(pixelDistance([0, -179.5], [0, 179.5], 0)).toBeCloseTo(256 / 360);
  });

  it("doubles with every zoom level", () => {
    const base = pixelDistance([52.37, 4.9], [52.38, 4.91], 10);
    expect(pixelDistance([52.37, 4.9], [52.38, 4.91], 12)).toBeCloseTo(
      base * 4
    );
  });

  it("is zero for the same position", () => {
    expect(pixelDistance([52.37, 4.9], [52.37, 4.9], 15)).toBe(0);
  });

  it("stays finite at the poles", () => {
    expect(pixelDistance([90, 0], [90, 90], 3)).toBeCloseTo(512);
  });
});
