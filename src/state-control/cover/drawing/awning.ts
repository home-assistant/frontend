import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, pill, targetLine } from "./shared";

const SCALLOPS = 6;

const extent = (value: number) => Math.max(8, (VB.ih * 0.9 * value) / 100);

export const awningShape: CoverShape = {
  horizontal: false,
  render: ({ value, handle, target }) => {
    const { x, y, iw } = VB;
    const height = extent(value);
    const width = iw / SCALLOPS;
    let path = `M${x},${y} H${x + iw} V${y + height}`;
    for (let index = SCALLOPS; index > 0; index--) {
      path += ` Q${x + (index - 0.5) * width},${y + height + 8} ${x + (index - 1) * width},${y + height}`;
    }
    return {
      cover: svg`
        <path class="fabric" d=${`${path} Z`}></path>
        ${Array.from(
          { length: SCALLOPS - 1 },
          (_, index) =>
            svg`<line class="fabric-line" x1=${x + (index + 1) * width} y1=${y} x2=${x + (index + 1) * width} y2=${y + height}></line>`
        )}
        <rect class="edge" x=${x} y=${y} width=${iw} height="8"></rect>
      `,
      ghost:
        target !== undefined
          ? targetLine(x, y + extent(target), x + iw, y + extent(target))
          : nothing,
      handle:
        handle !== undefined
          ? pill(x + iw / 2, y + extent(handle) + 4, false)
          : nothing,
    };
  },
  valueAt: (_x, y) => ((y - VB.y) / (VB.ih * 0.9)) * 100,
};
