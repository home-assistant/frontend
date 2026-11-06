import { svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, ghost, horizontalEdge } from "./shared";

const HALF = VB.ih / 2;
const TRAVEL = HALF * 0.92;
const SASH_HEIGHT = HALF - 4;

const lowerTop = (value: number) => VB.y + HALF - (TRAVEL * value) / 100;

const gripY = (value: number) => lowerTop(value) + SASH_HEIGHT + 1;

export const sashShape: CoverShape = {
  horizontal: false,
  openingAngle: 0,
  render: ({ value }) => {
    const { x, y, iw, ih } = VB;
    const top = lowerTop(value);
    return {
      back: svg`
        <rect class="window-frame" x=${x} y=${y} width=${iw} height=${ih}></rect>
        <rect class="glass sash" x=${x + 4} y=${y + 4} width=${iw - 8} height=${HALF}></rect>
      `,
      cover: svg`
        <rect class="glass sash" x=${x + 4} y=${top.toFixed(1)} width=${iw - 8} height=${SASH_HEIGHT}></rect>
        <line class="mullion" x1=${x + iw / 2} y1=${top.toFixed(1)} x2=${x + iw / 2} y2=${(top + SASH_HEIGHT).toFixed(1)}></line>
      `,
    };
  },
  grip: (value) => [VB.x + VB.iw / 2, gripY(value)],
  edge: (value) => horizontalEdge(gripY(value), 4),
  silhouette: (value) =>
    ghost(
      svg`<rect x=${VB.x + 4} y=${lowerTop(value).toFixed(1)} width=${VB.iw - 8} height=${SASH_HEIGHT}></rect>`
    ),
  valueAt: (_x, y) => ((VB.y + VB.ih - y) / TRAVEL) * 100,
};
