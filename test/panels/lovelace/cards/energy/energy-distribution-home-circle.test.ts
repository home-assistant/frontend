/**
 * Protects the energy-distribution home ring from overflowing when hourly
 * allocation yields more used_solar/used_battery/used_grid than net used_total
 * (https://github.com/home-assistant/frontend/issues/54185).
 */
import { assert, describe, it } from "vitest";

import {
  ENERGY_DISTRIBUTION_HOME_CIRCLE_CIRCUMFERENCE as CIRCLE,
  computeEnergyDistributionHomeCircleArcs,
} from "../../../../../src/panels/lovelace/cards/energy/energy-distribution-home-circle";

const sumDefinedArcs = (
  arcs: ReturnType<typeof computeEnergyDistributionHomeCircleArcs>
): number =>
  (arcs.solar ?? 0) +
  (arcs.battery ?? 0) +
  (arcs.lowCarbon ?? 0) +
  (arcs.grid ?? 0);

describe("computeEnergyDistributionHomeCircleArcs", () => {
  it("sizes arcs from allocated home flows so they fill the circle", () => {
    const arcs = computeEnergyDistributionHomeCircleArcs({
      usedSolar: 8.5,
      usedBattery: 4.6,
      usedGrid: 0.12,
      hasSolar: true,
      hasGrid: true,
    });

    assert.approximately(arcs.solar!, CIRCLE * (8.5 / 13.22), 1e-6);
    assert.approximately(arcs.battery!, CIRCLE * (4.6 / 13.22), 1e-6);
    assert.approximately(arcs.grid!, CIRCLE * (0.12 / 13.22), 1e-6);
    assert.approximately(sumDefinedArcs(arcs), CIRCLE, 1e-6);
    assert.isAtLeast(arcs.grid!, 0);
  });

  it("does not paint a full grid ring when used_solar exceeds net home energy", () => {
    // Screenshot totals from #54185 with solar and export in different hours:
    // used_solar 77.1, used_battery 0, used_grid 0, net used_total 13.22.
    const arcs = computeEnergyDistributionHomeCircleArcs({
      usedSolar: 77.1,
      usedBattery: 0,
      usedGrid: 0,
      hasSolar: true,
      hasGrid: true,
    });

    assert.approximately(arcs.solar!, CIRCLE, 1e-6);
    assert.isUndefined(arcs.battery);
    assert.equal(arcs.grid, 0);
    assert.approximately(sumDefinedArcs(arcs), CIRCLE, 1e-6);
  });

  it("keeps a zero-consumption ring from producing NaN or negative dashes", () => {
    const arcs = computeEnergyDistributionHomeCircleArcs({
      usedSolar: 0,
      usedBattery: 0,
      usedGrid: 0,
      hasSolar: true,
      hasGrid: true,
    });

    assert.deepEqual(arcs, {});
  });

  it("splits grid into low-carbon and high-carbon without exceeding the grid share", () => {
    const arcs = computeEnergyDistributionHomeCircleArcs({
      usedSolar: 4,
      usedBattery: 0,
      usedGrid: 6,
      hasSolar: true,
      hasGrid: true,
      highCarbonConsumption: 2,
    });

    const ringTotal = 10;
    assert.approximately(arcs.solar!, CIRCLE * (4 / ringTotal), 1e-6);
    assert.approximately(arcs.lowCarbon!, CIRCLE * (4 / ringTotal), 1e-6);
    assert.approximately(arcs.grid!, CIRCLE * (2 / ringTotal), 1e-6);
    assert.approximately(sumDefinedArcs(arcs), CIRCLE, 1e-6);
    assert.isAtLeast(arcs.lowCarbon!, 0);
    assert.isAtLeast(arcs.grid!, 0);
  });

  it("clamps high-carbon consumption to the grid share", () => {
    const arcs = computeEnergyDistributionHomeCircleArcs({
      usedSolar: 5,
      usedBattery: 0,
      usedGrid: 5,
      hasSolar: true,
      hasGrid: true,
      highCarbonConsumption: 50,
    });

    assert.isUndefined(arcs.lowCarbon);
    assert.approximately(arcs.grid!, CIRCLE * 0.5, 1e-6);
    assert.approximately(sumDefinedArcs(arcs), CIRCLE, 1e-6);
  });
});
