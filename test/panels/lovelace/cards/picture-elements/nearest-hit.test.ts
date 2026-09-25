import { describe, expect, it } from "vitest";
import type { HitTarget } from "../../../../../src/panels/lovelace/cards/picture-elements/nearest-hit";
import {
  isInsideBox,
  pickNearestTarget,
} from "../../../../../src/panels/lovelace/cards/picture-elements/nearest-hit";

interface TestTarget extends HitTarget {
  id: string;
}

// A deliberately awkward overlapping cluster: two adjacent icons (A, B) whose
// boxes overlap, plus an icon (C) overlapping a label (L).
const A: TestTarget = { id: "A", isIcon: true, x1: 80, x2: 80, cy: 80, bx: 60, by: 60, bw: 40, bh: 40 }; // prettier-ignore
const B: TestTarget = { id: "B", isIcon: true, x1: 108, x2: 108, cy: 80, bx: 88, by: 60, bw: 40, bh: 40 }; // prettier-ignore
const C: TestTarget = { id: "C", isIcon: true, x1: 200, x2: 200, cy: 120, bx: 180, by: 100, bw: 40, bh: 40 }; // prettier-ignore
const L: TestTarget = { id: "L", isIcon: false, x1: 205, x2: 295, cy: 120, bx: 205, by: 106, bw: 90, bh: 28 }; // prettier-ignore
const SEEDS = [A, B, C, L];
const REACH = 24;

const pick = (x: number, y: number) => pickNearestTarget(SEEDS, x, y, REACH);

describe("pickNearestTarget", () => {
  it("routes a direct tap to its own icon", () => {
    expect(pick(80, 80)).toBe(A);
    expect(pick(108, 80)).toBe(B);
    expect(pick(200, 120)).toBe(C);
  });

  it("keeps icon-box corners clickable (they sit beyond point reach)", () => {
    // A's corners are ~28px from its center, past REACH, but still inside its
    // box, so they must stay routed to A (using A's left corners, clear of B).
    expect(pick(61, 61)).toBe(A);
    expect(pick(61, 99)).toBe(A);
  });

  it("splits the gap between two icons by proximity (Voronoi boundary)", () => {
    expect(pick(90, 80)).toBe(A); // closer to A (center 80)
    expect(pick(102, 80)).toBe(B); // closer to B (center 108)
  });

  it("fills empty space around an icon up to reach, then yields to background", () => {
    expect(pick(80, 58)).toBe(A); // 22px above A's center, within reach
    expect(pick(80, 30)).toBeUndefined(); // 50px above center, background
  });

  it("keeps the label when the tap is on the label text, even under an icon", () => {
    // (210,120) is inside both C's box and L's text box: a tap on the text
    // always triggers the label.
    expect(isInsideBox(C, 210, 120)).toBe(true);
    expect(isInsideBox(L, 210, 120)).toBe(true);
    expect(pick(210, 120)).toBe(L);
  });

  it("gives the icon the overlap area that is NOT on the label text", () => {
    // (185,120) is inside C's box but not on L's text: the icon wins.
    expect(isInsideBox(C, 185, 120)).toBe(true);
    expect(isInsideBox(L, 185, 120)).toBe(false);
    expect(pick(185, 120)).toBe(C);
  });

  it("respects a plain label tap even when an icon is within reach", () => {
    // (222,120) is on the label text only, but within reach of C's center;
    // the direct text hit still wins over the icon's reach.
    expect(isInsideBox(C, 222, 120)).toBe(false);
    expect(pick(222, 120)).toBe(L);
  });

  it("prefers the nearest icon over a farther label in open space", () => {
    // Just left of both boxes: nearest icon C beats label L.
    expect(pick(178, 120)).toBe(C);
  });
});

describe("nearest-hit sweep (quality guarantee vs. box-only hit-testing)", () => {
  const W = 360;
  const H = 200;
  // Baseline: a tap counts only when it lands inside an element's own box.
  const pickOld = (x: number, y: number) =>
    SEEDS.find((s) => isInsideBox(s, x, y));

  const sweep = () => {
    let reachOld = 0;
    let reachNew = 0;
    let deadRegressions = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const old = pickOld(x, y);
        const next = pick(x, y);
        if (old) reachOld++;
        if (next) reachNew++;
        if (old && !next) deadRegressions++;
      }
    }
    return { reachOld, reachNew, deadRegressions };
  };

  it("never turns a previously-clickable point dead (strictly additive)", () => {
    expect(sweep().deadRegressions).toBe(0);
  });

  it("makes materially more of the card actionable", () => {
    const { reachOld, reachNew } = sweep();
    // The invariant is "strictly more"; the loose floor is a sanity check, not a
    // number tied to the exact fixture geometry.
    expect(reachNew).toBeGreaterThan(reachOld);
    expect(reachNew / reachOld).toBeGreaterThan(1.1);
  });
});

describe("pickNearestTarget edge cases", () => {
  it("returns undefined for no seeds", () => {
    expect(pickNearestTarget([], 10, 10, REACH)).toBeUndefined();
  });

  it("returns undefined for a tap outside every box and beyond reach", () => {
    expect(pick(80, 20)).toBeUndefined(); // 60px above A's center
  });

  it("respects the reach boundary (exclusive)", () => {
    // A single icon at the origin; reach 10.
    const dot: TestTarget = { id: "D", isIcon: true, x1: 0, x2: 0, cy: 0, bx: -1, by: -1, bw: 2, bh: 2 }; // prettier-ignore
    expect(pickNearestTarget([dot], 9, 0, 10)).toBe(dot); // inside reach
    expect(pickNearestTarget([dot], 10, 0, 10)).toBeUndefined(); // exactly reach
  });

  it("routes to the nearest of two labels by distance to the text line", () => {
    const top: TestTarget = { id: "T", isIcon: false, x1: 0, x2: 40, cy: 0, bx: 0, by: -8, bw: 40, bh: 16 }; // prettier-ignore
    const bottom: TestTarget = { id: "Bt", isIcon: false, x1: 0, x2: 40, cy: 30, bx: 0, by: 22, bw: 40, bh: 16 }; // prettier-ignore
    const two = [top, bottom];
    expect(pickNearestTarget(two, 20, 5, REACH)).toBe(top);
    expect(pickNearestTarget(two, 20, 25, REACH)).toBe(bottom);
  });
});
