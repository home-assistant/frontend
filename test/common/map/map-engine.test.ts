import { describe, expect, it } from "vitest";
import type { MapLatLng } from "../../../src/common/map/map-engine";
import {
  pixelDistance,
  unwrapLongitudes,
} from "../../../src/common/map/map-engine";

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

describe("unwrapLongitudes", () => {
  it("leaves points around the prime meridian untouched", () => {
    const points: MapLatLng[] = [
      [51.5, -0.1],
      [48.86, 2.35],
    ];
    expect(unwrapLongitudes(points)).toBe(points);
  });

  it("crosses the antimeridian when that is the shorter arc", () => {
    expect(
      unwrapLongitudes([
        [64.5, -165.4],
        [53, 158.65],
      ])
    ).toEqual([
      [64.5, 194.6],
      [53, 158.65],
    ]);
  });

  it("cuts at the widest gap rather than at the prime meridian", () => {
    const lngs = unwrapLongitudes([
      [0, -170],
      [0, -5],
      [0, 5],
      [0, 170],
    ]).map(([, lng]) => lng);
    expect(lngs).toEqual([190, -5, 5, 170]);
  });

  it("keeps the fitted center within ±180°", () => {
    const lngs = unwrapLongitudes([
      [0, -170],
      [0, -10],
      [0, 170],
    ]).map(([, lng]) => lng);
    expect(lngs).toEqual([-170, -10, -190]);
  });

  it("keeps a circle reaching a pole spanning every longitude", () => {
    // circleBoundsPoints output for a zone that reaches the north pole
    const points: MapLatLng[] = [
      [80, -180],
      [90, 180],
    ];
    expect(unwrapLongitudes(points)).toBe(points);
  });

  it("keeps a single longitude untouched", () => {
    const points: MapLatLng[] = [
      [10, -170],
      [20, -170],
    ];
    expect(unwrapLongitudes(points)).toBe(points);
  });
});
