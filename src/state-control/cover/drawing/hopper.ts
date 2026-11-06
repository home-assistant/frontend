import { svg } from "lit";
import type { CoverShape } from "./shared";
import { VB } from "./shared";

const LEAN = 0.12;
const SIDE = 14;

const drop = (value: number) => (VB.ih * LEAN * value) / 100;

const side = (value: number) => (SIDE * value) / 100;

const gripY = (value: number) => VB.y + drop(value) + 2;

export const hopperShape: CoverShape = {
  horizontal: false,
  render: ({ tilt }) => {
    const { x, y, iw, ih } = VB;
    const top = drop(tilt);
    const inset = side(tilt);
    const middle = y + ih * 0.55;
    const middleInset = inset * (1 - (middle - y - top) / (ih - top));
    return {
      back: svg`<rect class="window-frame" x=${x} y=${y} width=${iw} height=${ih}></rect>`,
      cover: svg`
        <polygon
          class="glass sash"
          stroke-linejoin="round"
          points=${`${x + inset},${y + top} ${x + iw - inset},${y + top} ${x + iw},${y + ih} ${x},${y + ih}`}
        ></polygon>
        <line class="mullion" x1=${(x + middleInset).toFixed(1)} y1=${middle} x2=${(x + iw - middleInset).toFixed(1)} y2=${middle}></line>
        <line class="mullion" x1=${x + iw / 2} y1=${(y + top).toFixed(1)} x2=${x + iw / 2} y2=${y + ih}></line>
      `,
    };
  },
  grip: (value) => [VB.x + VB.iw / 2, gripY(value)],
  edge: (value) =>
    `M${VB.x + side(value)} ${gripY(value)} H${VB.x + VB.iw - side(value)}`,
  valueAt: (_x, y) => ((y - VB.y) / (VB.ih * LEAN)) * 100,
};
