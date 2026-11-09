import { svg } from "lit";
import type { CoverShape } from "./shared";
import { FRAME, ghost, valueAxis } from "./shared";

const TRAVEL = FRAME.width - 28;
const GATE_TOP = FRAME.top + FRAME.height * 0.36;
const GROUND = FRAME.bottom - 20;
const GATE_HEIGHT = GROUND - GATE_TOP;
const BOARDS = 6;
const BOARD_GAP = 4;
const BOARD_HEIGHT = (GATE_HEIGHT - BOARD_GAP * (BOARDS - 1)) / BOARDS;
const POST_WIDTH = 7;

const leadingEdge = valueAxis(FRAME.right, FRAME.right - TRAVEL);

const gateLeft = (value: number) => leadingEdge.coordAt(value) - FRAME.width;

const GRASS = (() => {
  let path = `M${FRAME.left},${FRAME.bottom} V${GROUND}`;
  for (let x = FRAME.left, index = 0; x < FRAME.right; x += 9, index++) {
    path += ` Q${x + 4.5},${GROUND - (index % 3 === 1 ? 6 : 4)} ${x + 9},${GROUND}`;
  }
  return `${path} V${FRAME.bottom} Z`;
})();

export const slideShape: CoverShape = {
  opens: "left",
  render: ({ position, id }) => {
    const left = gateLeft(position);
    return {
      cover: svg`
        ${Array.from(
          { length: BOARDS },
          (_, index) =>
            svg`<rect class="metal" x=${left} y=${(GATE_TOP + index * (BOARD_HEIGHT + BOARD_GAP)).toFixed(1)} width=${FRAME.width} height=${BOARD_HEIGHT.toFixed(1)} rx="2"></rect>`
        )}
        <rect class="metal" x=${left} y=${GATE_TOP} width=${POST_WIDTH} height=${GATE_HEIGHT} rx="2"></rect>
        <rect class="metal" x=${left + FRAME.width - POST_WIDTH} y=${GATE_TOP} width=${POST_WIDTH} height=${GATE_HEIGHT} rx="2"></rect>
      `,
      front: svg`<path d=${GRASS} fill=${`url(#${id}-grass)`}></path>`,
    };
  },
  handleAt: (value) => [leadingEdge.coordAt(value), GATE_TOP + GATE_HEIGHT / 2],
  valueAt: (x) => leadingEdge.valueAt(x),
  targetLine: (value) =>
    `M${leadingEdge.coordAt(value).toFixed(1)} ${GATE_TOP} V${GROUND}`,
  targetShape: (value) =>
    ghost(
      svg`<rect x=${gateLeft(value)} y=${GATE_TOP} width=${FRAME.width} height=${GATE_HEIGHT} rx="2"></rect>`
    ),
};
