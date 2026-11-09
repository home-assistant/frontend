import { svg } from "lit";
import type { CoverShape } from "./shared";
import { FRAME, tiltGeometry, valueAxis } from "./shared";

const MAX_DROP = FRAME.height * 0.12;
const MAX_SIDE_INSET = 14;

const sashTop = valueAxis(FRAME.top, FRAME.top + MAX_DROP);

const sideInset = (value: number) => (MAX_SIDE_INSET * value) / 100;

export const hopperShape: CoverShape = {
  ...tiltGeometry,
  render: ({ tilt }) => {
    const { left, top, right, bottom, width, height, centerX } = FRAME;
    const sashY = sashTop.coordAt(tilt);
    const inset = sideInset(tilt);
    const middle = top + height * 0.55;
    const middleInset = inset * (1 - (middle - sashY) / (bottom - sashY));
    return {
      back: svg`<rect class="window-frame" x=${left} y=${top} width=${width} height=${height}></rect>`,
      cover: svg`
        <polygon
          class="glass sash"
          stroke-linejoin="round"
          points=${`${left + inset},${sashY} ${right - inset},${sashY} ${right},${bottom} ${left},${bottom}`}
        ></polygon>
        <line class="mullion" x1=${(left + middleInset).toFixed(1)} y1=${middle} x2=${(right - middleInset).toFixed(1)} y2=${middle}></line>
        <line class="mullion" x1=${centerX} y1=${sashY.toFixed(1)} x2=${centerX} y2=${bottom}></line>
      `,
    };
  },
};
