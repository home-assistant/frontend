import { svg } from "lit";
import { clamp } from "../../../common/number/clamp";
import type { CoverShape } from "./shared";
import { FRAME, ghost, headrail, valueAxis } from "./shared";

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

const freeEdge = valueAxis(FRAME.right, FRAME.left + GATHERED);

const toPath = (points: Point[]) =>
  points
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(" ");

const hang = (t: number) => t ** 1.3;

const verticalLine = (xAt: (t: number) => number): Point[] =>
  Array.from({ length: ROWS + 1 }, (_, row) => [
    xAt(row / ROWS),
    FRAME.top + (FRAME.height * row) / ROWS,
  ]);

const swingWave = (t: number, phase: number, delay = 0) =>
  Math.sin(t * Math.PI * 1.2 + phase - delay) * hang(t) * 1.4;

const restWave = (t: number, phase: number, delay = 0) =>
  Math.sin(t * Math.PI * 2 + phase * 0.6 - delay) * hang(t);

export const curtainShape: CoverShape = {
  opens: "left",
  usesWave: true,
  render: ({ position, wave }) => {
    const { left, top, bottom } = FRAME;
    const open = position / 100;
    const width = freeEdge.coordAt(position) - left;
    const velocity = clamp(-wave.velocity, -MAX_SPEED, MAX_SPEED);
    const phase = wave.phase;
    const swing =
      Math.min(MAX_SWING, Math.abs(velocity) * SWING_PER_SPEED) *
      Math.sign(velocity || 1);
    const rest = open * REST_SWAY;
    const lag = (t: number) =>
      -Math.abs(velocity) * HEM_LAG * t ** 1.5 * Math.sign(velocity);

    const hem = verticalLine(
      (t) =>
        left +
        width +
        lag(t) +
        swing * swingWave(t, phase) +
        rest * restWave(t, phase)
    );
    const fold = (index: number) => {
      const distance = 1 - index / (FOLDS + 1);
      const weight = (1 - distance) ** 1.3;
      return verticalLine(
        (t) =>
          left +
          (width * index) / (FOLDS + 1) +
          lag(t) * weight +
          swing *
            FOLD_SWING *
            swingWave(t, phase, distance * FOLD_DELAY) *
            weight +
          rest *
            FOLD_REST_SWAY *
            restWave(t, phase, distance * FOLD_REST_DELAY) *
            open *
            (0.4 + 0.6 * weight)
      );
    };
    const folds = Array.from({ length: FOLDS }, (_, index) => fold(index + 1));
    const stripes: string[] = [];
    for (let index = 0; index < folds.length - 1; index += 2) {
      stripes.push(
        `${toPath([...folds[index], ...folds[index + 1].slice().reverse()])} Z`
      );
    }
    return {
      cover: svg`
        <path class="fabric" d=${`${toPath([[left, top], ...hem, [left, bottom]])} Z`}></path>
        ${stripes.map((d) => svg`<path class="stripe" d=${d}></path>`)}
      `,
      front: headrail(6.4),
    };
  },
  handleAt: (value) => [freeEdge.coordAt(value), FRAME.centerY],
  valueAt: (x) => freeEdge.valueAt(x),
  targetLine: (value) =>
    `M${freeEdge.coordAt(value).toFixed(1)} ${FRAME.top} V${FRAME.bottom}`,
  targetShape: (value) =>
    ghost(
      svg`<rect x=${FRAME.left} y=${FRAME.top} width=${(freeEdge.coordAt(value) - FRAME.left).toFixed(1)} height=${FRAME.height}></rect>`
    ),
};
