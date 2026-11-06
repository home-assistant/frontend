import { svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, ghost, headrail } from "./shared";

const GATHERED = 22;
const ROWS = 12;
const FOLDS = 12;
const MAX_SPEED = 1.5;
const MAX_SWING = 4.8;
const SWING_PER_SPEED = 2.6;
const HEM_LAG = 4.6;
const REST_SWAY = 1.4;
const FOLD_SWING = 1.35;
const FOLD_REST_SWAY = 1.6;
const FOLD_DELAY = 3.2;
const FOLD_REST_DELAY = 2.5;

type Point = [number, number];

const edgeX = (value: number) =>
  VB.x + GATHERED + ((VB.iw - GATHERED) * (100 - value)) / 100;

const toPath = (points: Point[]) =>
  points
    .map(
      ([px, py], index) =>
        `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`
    )
    .join(" ");

export const curtainShape: CoverShape = {
  horizontal: true,
  openingAngle: -90,
  render: ({ value, wave, id }) => {
    const { x, y, ih } = VB;
    const open = value / 100;
    const width = edgeX(value) - x;
    const velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, -wave.velocity));
    const phase = wave.phase;
    const swing =
      Math.min(MAX_SWING, Math.abs(velocity) * SWING_PER_SPEED) *
      Math.sign(velocity || 1);
    const rest = open * REST_SWAY;
    const hang = (t: number) => t ** 1.3;
    const lag = (t: number) =>
      -Math.abs(velocity) * HEM_LAG * t ** 1.5 * Math.sign(velocity);
    const line = (fn: (t: number) => number): Point[] =>
      Array.from({ length: ROWS + 1 }, (_, row) => [
        fn(row / ROWS),
        y + (ih * row) / ROWS,
      ]);
    const freeEdge = line(
      (t) =>
        x +
        width +
        lag(t) +
        swing * Math.sin(t * Math.PI * 1.2 + phase) * hang(t) * 1.4 +
        rest * Math.sin(t * Math.PI * 2 + phase * 0.6) * hang(t)
    );
    const fold = (index: number) => {
      const distance = 1 - index / (FOLDS + 1);
      const weight = (1 - distance) ** 1.3;
      return line(
        (t) =>
          x +
          (width * index) / (FOLDS + 1) +
          lag(t) * weight +
          swing *
            FOLD_SWING *
            Math.sin(t * Math.PI * 1.2 + phase - distance * FOLD_DELAY) *
            hang(t) *
            1.4 *
            weight +
          rest *
            FOLD_REST_SWAY *
            Math.sin(
              t * Math.PI * 2 + phase * 0.6 - distance * FOLD_REST_DELAY
            ) *
            hang(t) *
            open *
            (0.4 + 0.6 * weight)
      );
    };
    const lines = [
      line(() => x),
      ...Array.from({ length: FOLDS }, (_, index) => fold(index + 1)),
      freeEdge,
    ];
    const bands: string[] = [];
    for (let index = 1; index < lines.length - 1; index += 2) {
      const back = lines[index + 1]
        .slice()
        .reverse()
        .map(([px, py]) => `L${px.toFixed(1)} ${py.toFixed(1)}`)
        .join(" ");
      bands.push(`${toPath(lines[index])} ${back} Z`);
    }
    return {
      cover: svg`
        <path class="fabric" d=${`M${x} ${y} ${toPath(freeEdge).replace(/^M/, "L")} L${x} ${y + ih} Z`}></path>
        ${bands.map((d) => svg`<path class="stripe" d=${d}></path>`)}
      `,
      front: headrail(id, 6.4),
    };
  },
  grip: (value) => [edgeX(value), VB.y + VB.ih / 2],
  edge: (value) => `M${edgeX(value).toFixed(1)} ${VB.y} V${VB.y + VB.ih}`,
  silhouette: (value) =>
    ghost(
      svg`<rect x=${VB.x} y=${VB.y} width=${(edgeX(value) - VB.x).toFixed(1)} height=${VB.ih}></rect>`
    ),
  valueAt: (x) => 100 - ((x - VB.x - GATHERED) / (VB.iw - GATHERED)) * 100,
};
