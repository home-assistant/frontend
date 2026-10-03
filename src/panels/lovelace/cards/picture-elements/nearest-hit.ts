// Pure geometry for routing a tap to the nearest picture-elements target.
// Kept free of the DOM so it can be unit-tested and swept in isolation; the card
// feeds it seeds already resolved to root-relative coordinates.

export interface HitTarget {
  // Icons are a point (x1 === x2); labels are the horizontal text segment x1..x2
  // at the vertical center line cy.
  isIcon: boolean;
  x1: number;
  x2: number;
  cy: number;
  // The element's current clickable box, used for the direct-hit membership test.
  bx: number;
  by: number;
  bw: number;
  bh: number;
}

// Squared distance from (x, y) to the seed segment (dx clamped to the segment,
// dy to the center line). Squared to avoid a sqrt in the hot path.
export const seedDistanceSquared = (
  seed: HitTarget,
  x: number,
  y: number
): number => {
  const dx = Math.max(seed.x1 - x, x - seed.x2, 0);
  const dy = y - seed.cy;
  return dx * dx + dy * dy;
};

export const isInsideBox = (seed: HitTarget, x: number, y: number): boolean =>
  x >= seed.bx &&
  x <= seed.bx + seed.bw &&
  y >= seed.by &&
  y <= seed.by + seed.bh;

// Pick the target a tap at (x, y) belongs to. A tap on a label's own text always
// keeps that label; otherwise icons take priority:
//   1. a tap inside a label's (text) box keeps that label,
//   2. otherwise a tap inside an icon's box wins (this also covers the box
//      corners, which lie past point reach),
//   3. otherwise the nearest icon within `reach` px wins the open space,
//   4. otherwise the nearest label within `reach` px.
// Every element box stays clickable; undefined means the tap is outside every
// box and beyond reach of every seed (it belongs to the background/image).
export const pickNearestTarget = <T extends HitTarget>(
  seeds: readonly T[],
  x: number,
  y: number,
  reach: number
): T | undefined => {
  const reachSquared = reach * reach;
  let directIcon: T | undefined;
  let directLabel: T | undefined;
  let nearestIcon: T | undefined;
  let nearestLabel: T | undefined;
  let directIconDist = Infinity;
  let directLabelDist = Infinity;
  let iconDist = reachSquared;
  let labelDist = reachSquared;
  for (const seed of seeds) {
    const dist = seedDistanceSquared(seed, x, y);
    const inside = isInsideBox(seed, x, y);
    if (seed.isIcon) {
      if (inside && dist < directIconDist) {
        directIconDist = dist;
        directIcon = seed;
      }
      if (dist < iconDist) {
        iconDist = dist;
        nearestIcon = seed;
      }
    } else {
      if (inside && dist < directLabelDist) {
        directLabelDist = dist;
        directLabel = seed;
      }
      if (dist < labelDist) {
        labelDist = dist;
        nearestLabel = seed;
      }
    }
  }
  return directLabel ?? directIcon ?? nearestIcon ?? nearestLabel;
};
