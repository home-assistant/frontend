/**
 * Deterministic seeded PRNG (mulberry32) for reproducible fixtures.
 * The same seed always yields the same sequence, so characterization
 * tests and benchmarks operate on identical data across runs.
 */
/* eslint-disable no-bitwise */
export type SeededRandom = () => number;

export const createSeededRandom = (seed: number): SeededRandom => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
