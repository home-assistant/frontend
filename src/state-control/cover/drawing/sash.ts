import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, pill, targetLine } from "./shared";

const HALF = VB.ih / 2;
const TRAVEL = HALF * 0.92;

const sashBottom = (value: number) => VB.y + VB.ih - (TRAVEL * value) / 100;

export const sashShape: CoverShape = {
  horizontal: false,
  render: ({ value, handle, target }) => {
    const { x, y, iw } = VB;
    const top = (y + HALF - (TRAVEL * value) / 100).toFixed(1);
    const bottom = (y + 2 * HALF - (TRAVEL * value) / 100).toFixed(1);
    return {
      cover: svg`
        <rect class="glass frame-sash" x=${x} y=${y} width=${iw} height=${HALF + 3}></rect>
        <rect class="glass sash" x=${x} y=${top} width=${iw} height=${HALF}></rect>
        <line class="mullion" x1=${x + iw / 2} y1=${top} x2=${x + iw / 2} y2=${bottom}></line>
      `,
      ghost:
        target !== undefined
          ? targetLine(x, sashBottom(target), x + iw, sashBottom(target))
          : nothing,
      handle:
        handle !== undefined
          ? pill(x + iw / 2, sashBottom(handle) - 3, false)
          : nothing,
    };
  },
  valueAt: (_x, y) => ((VB.y + VB.ih - y) / TRAVEL) * 100,
};
