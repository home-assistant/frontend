/**
 * Characterization tests pinning the exact current output of the energy
 * dashboard data processing. These exist so performance optimizations can be
 * verified to leave behavior bit-identical — see test/benchmarks/README.md.
 *
 * Do NOT update these snapshots to make an optimization pass; an output
 * change is a behavior change and must be escalated instead.
 */
import { describe, expect, it } from "vitest";
import {
  computeConsumptionData,
  computeConsumptionSingle,
  getSummedData,
} from "../../src/data/energy";
import { digestResult } from "../fixtures/digest";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../fixtures/energy";

describe("getSummedData characterization", () => {
  it("matches snapshot for a grid-only setup", () => {
    const data = generateEnergyData(1, {
      days: 1,
      prefs: generateEnergyPreferences({ grid: true }),
    });
    expect(getSummedData(data)).toMatchSnapshot();
  });

  it("matches snapshot for grid + solar", () => {
    const data = generateEnergyData(2, {
      days: 1,
      prefs: generateEnergyPreferences({ grid: true, solar: true }),
    });
    expect(getSummedData(data)).toMatchSnapshot();
  });

  it("matches snapshot for a full setup with compare data", () => {
    const data = generateEnergyData(3, { days: 1, compare: true });
    expect(getSummedData(data)).toMatchSnapshot();
  });

  it("digest is stable for a month of 5-minute data", () => {
    const data = generateEnergyData(4, { days: 31, period: "hour" });
    expect(digestResult(getSummedData(data).summedData)).toMatchSnapshot();
  });
});

describe("computeConsumptionData characterization", () => {
  it("matches snapshot for a full battery + solar setup", () => {
    const data = generateEnergyData(5, { days: 1 });
    const { summedData } = getSummedData(data);
    expect(computeConsumptionData(summedData, undefined)).toMatchSnapshot();
  });

  it("matches snapshot with compare data", () => {
    const data = generateEnergyData(6, { days: 1, compare: true });
    const { summedData, compareSummedData } = getSummedData(data);
    expect(
      computeConsumptionData(summedData, compareSummedData)
    ).toMatchSnapshot();
  });

  it("digest is stable for a month of hourly data", () => {
    const data = generateEnergyData(7, { days: 31, period: "hour" });
    const { summedData } = getSummedData(data);
    expect(
      digestResult(computeConsumptionData(summedData, undefined).consumption)
    ).toMatchSnapshot();
  });
});

describe("computeConsumptionSingle characterization", () => {
  it("handles grid-only consumption", () => {
    expect(
      computeConsumptionSingle({
        from_grid: 5,
        to_grid: undefined,
        solar: undefined,
        to_battery: undefined,
        from_battery: undefined,
      })
    ).toMatchSnapshot();
  });

  it("handles solar excess returned to grid", () => {
    expect(
      computeConsumptionSingle({
        from_grid: 1,
        to_grid: 4,
        solar: 8,
        to_battery: undefined,
        from_battery: undefined,
      })
    ).toMatchSnapshot();
  });

  it("handles a full battery flow", () => {
    expect(
      computeConsumptionSingle({
        from_grid: 2,
        to_grid: 1,
        solar: 6,
        to_battery: 3,
        from_battery: 2,
      })
    ).toMatchSnapshot();
  });

  it("handles battery charged from grid", () => {
    expect(
      computeConsumptionSingle({
        from_grid: 6,
        to_grid: 0,
        solar: 0,
        to_battery: 4,
        from_battery: 0,
      })
    ).toMatchSnapshot();
  });
});
