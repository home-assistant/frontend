import { svg } from "lit";
import type { CoverShape } from "./shared";
import { FRAME, ghost, horizontalLine, valueAxis } from "./shared";

const HALF = FRAME.height / 2;
const TRAVEL = HALF * 0.92;
const SASH_INSET = 4;
const SASH_HEIGHT = HALF - SASH_INSET;
const HANDLE_INSET = 3;

const lowerSashTop = valueAxis(FRAME.top + HALF, FRAME.top + HALF - TRAVEL);

const handleY = (value: number) =>
  lowerSashTop.coordAt(value) + SASH_HEIGHT + SASH_INSET - HANDLE_INSET;

export const sashShape: CoverShape = {
  opens: "up",
  render: ({ position }) => {
    const { left, top, width, height, centerX } = FRAME;
    const sashTop = lowerSashTop.coordAt(position);
    return {
      back: svg`
        <rect class="window-frame" x=${left} y=${top} width=${width} height=${height}></rect>
        <rect class="glass sash" x=${left + SASH_INSET} y=${top + SASH_INSET} width=${width - 2 * SASH_INSET} height=${HALF}></rect>
      `,
      cover: svg`
        <rect class="glass sash" x=${left + SASH_INSET} y=${sashTop.toFixed(1)} width=${width - 2 * SASH_INSET} height=${SASH_HEIGHT}></rect>
        <line class="mullion" x1=${centerX} y1=${sashTop.toFixed(1)} x2=${centerX} y2=${(sashTop + SASH_HEIGHT).toFixed(1)}></line>
      `,
    };
  },
  handleAt: (value) => [FRAME.centerX, handleY(value)],
  valueAt: (_x, y) =>
    lowerSashTop.valueAt(y - SASH_HEIGHT - SASH_INSET + HANDLE_INSET),
  targetLine: (value) => horizontalLine(handleY(value), SASH_INSET),
  targetShape: (value) =>
    ghost(
      svg`<rect x=${FRAME.left + SASH_INSET} y=${lowerSashTop.coordAt(value).toFixed(1)} width=${FRAME.width - 2 * SASH_INSET} height=${SASH_HEIGHT}></rect>`
    ),
};
