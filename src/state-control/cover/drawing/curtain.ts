import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, pill, targetLine } from "./shared";

const GATHERED = 22;

const edge = (value: number) =>
  VB.x + GATHERED + ((VB.iw - GATHERED) * (100 - value)) / 100;

export const curtainShape: CoverShape = {
  horizontal: true,
  render: ({ value, handle, target }) => {
    const { x, y, iw, ih } = VB;
    const width = edge(value) - x;
    const folds = Math.max(2, Math.round(width / 12));
    return {
      cover: svg`
        <rect class="fabric" x=${x} y=${y} width=${width.toFixed(1)} height=${ih}></rect>
        ${Array.from({ length: folds - 1 }, (_, index) => {
          const fx = (x + ((index + 1) * width) / folds).toFixed(1);
          return svg`<line class="fabric-line" x1=${fx} y1=${y} x2=${fx} y2=${y + ih}></line>`;
        })}
        <rect class="edge" x=${x} y=${y} width=${iw} height="6"></rect>
      `,
      ghost:
        target !== undefined
          ? targetLine(edge(target), y, edge(target), y + ih)
          : nothing,
      handle:
        handle !== undefined ? pill(edge(handle), y + ih / 2, true) : nothing,
    };
  },
  valueAt: (x) => 100 - ((x - VB.x - GATHERED) / (VB.iw - GATHERED)) * 100,
};
