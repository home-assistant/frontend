import { svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, ghost } from "./shared";

const TRAVEL = VB.iw - 28;
const GATE_TOP = VB.y + VB.ih * 0.36;
const GROUND = VB.y + VB.ih - 20;
const GATE_HEIGHT = GROUND - GATE_TOP;
const BOARDS = 6;
const BOARD_GAP = 4;
const BOARD_HEIGHT = (GATE_HEIGHT - BOARD_GAP * (BOARDS - 1)) / BOARDS;

const left = (value: number) => VB.x - (TRAVEL * value) / 100;

const gripX = (value: number) => left(value) + VB.iw;

const grass = (() => {
  const { x, y, iw, ih } = VB;
  let path = `M${x},${y + ih} V${GROUND}`;
  for (let gx = x, index = 0; gx < x + iw; gx += 9, index++) {
    path += ` Q${gx + 4.5},${GROUND - (index % 3 === 1 ? 6 : 4)} ${gx + 9},${GROUND}`;
  }
  return `${path} V${y + ih} Z`;
})();

export const slideShape: CoverShape = {
  horizontal: true,
  openingAngle: -90,
  render: ({ value, id }) => {
    const { iw } = VB;
    const gateLeft = left(value);
    return {
      cover: svg`
        ${Array.from(
          { length: BOARDS },
          (_, index) =>
            svg`<rect class="metal" x=${gateLeft} y=${(GATE_TOP + index * (BOARD_HEIGHT + BOARD_GAP)).toFixed(1)} width=${iw} height=${BOARD_HEIGHT.toFixed(1)} rx="2"></rect>`
        )}
        <rect class="metal" x=${gateLeft} y=${GATE_TOP} width="7" height=${GATE_HEIGHT} rx="2"></rect>
        <rect class="metal" x=${gateLeft + iw - 7} y=${GATE_TOP} width="7" height=${GATE_HEIGHT} rx="2"></rect>
      `,
      front: svg`<path d=${grass} fill=${`url(#${id}-grass)`}></path>`,
    };
  },
  grip: (value) => [gripX(value), GATE_TOP + GATE_HEIGHT / 2],
  edge: (value) => `M${gripX(value).toFixed(1)} ${GATE_TOP} V${GROUND}`,
  silhouette: (value) =>
    ghost(
      svg`<rect x=${left(value)} y=${GATE_TOP} width=${VB.iw} height=${GATE_HEIGHT} rx="2"></rect>`
    ),
  valueAt: (x) => ((VB.x + VB.iw - x) / TRAVEL) * 100,
};
