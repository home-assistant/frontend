/**
 * Home-circle stroke lengths for the energy distribution card.
 *
 * Hourly allocation can produce used_solar + used_battery + used_grid larger
 * than net used_total when some hours export more than they produce. Dividing
 * by net used_total then overflows the circle and the leftover grid arc goes
 * negative, which browsers paint as a solid grid ring.
 *
 * These arcs use the sum of the allocated home flows as the denominator so
 * they always fit the circumference.
 */
export const ENERGY_DISTRIBUTION_HOME_CIRCLE_CIRCUMFERENCE = 238.76104;

export interface EnergyDistributionHomeCircleArcs {
  solar?: number;
  battery?: number;
  lowCarbon?: number;
  highCarbon?: number;
  grid?: number;
}

export const computeEnergyDistributionHomeCircleArcs = ({
  usedSolar = 0,
  usedBattery = 0,
  usedGrid = 0,
  hasSolar,
  hasGrid,
  highCarbonConsumption,
  circumference = ENERGY_DISTRIBUTION_HOME_CIRCLE_CIRCUMFERENCE,
}: {
  usedSolar?: number;
  usedBattery?: number;
  usedGrid?: number;
  hasSolar: boolean;
  hasGrid: boolean;
  highCarbonConsumption?: number;
  circumference?: number;
}): EnergyDistributionHomeCircleArcs => {
  const solar = Math.max(usedSolar, 0);
  const battery = Math.max(usedBattery, 0);
  const grid = Math.max(usedGrid, 0);
  const ringTotal = solar + battery + grid;

  const arcs: EnergyDistributionHomeCircleArcs = {};
  // Leave arcs unset so the card can fall back to the plain home border
  // instead of painting zero-length dashes over a borderless circle.
  if (ringTotal <= 0) {
    return arcs;
  }

  const share = (value: number): number => circumference * (value / ringTotal);

  if (hasSolar) {
    arcs.solar = share(solar);
  }
  if (battery > 0) {
    arcs.battery = share(battery);
  }
  if (hasGrid) {
    if (highCarbonConsumption !== undefined) {
      const highCarbon = Math.min(Math.max(highCarbonConsumption, 0), grid);
      arcs.highCarbon = share(highCarbon);
      const lowCarbon = grid - highCarbon;
      if (lowCarbon > 0) {
        arcs.lowCarbon = share(lowCarbon);
      }
      arcs.grid = arcs.highCarbon;
    } else {
      arcs.grid = share(grid);
    }
  }

  return arcs;
};
