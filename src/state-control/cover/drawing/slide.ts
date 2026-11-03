import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, pill, targetLine } from "./shared";

const TRAVEL = VB.iw - 28;
const GATE_TOP = VB.y + 92;
const GROUND = VB.y + VB.ih - 24;
const BOARDS = 7;
const BOARD_GAP = 4;

const edge = (value: number) => VB.x + VB.iw - (TRAVEL * value) / 100;

const renderGate = (left: number, id: string) => {
  const { x, y, iw, ih } = VB;
  const height = GROUND - GATE_TOP;
  const boardHeight = (height - BOARD_GAP * (BOARDS - 1)) / BOARDS;
  let grass = `M${x},${y + ih} V${GROUND}`;
  for (let gx = x, index = 0; gx < x + iw; gx += 9, index++) {
    grass += ` Q${gx + 4.5},${GROUND - (index % 3 === 1 ? 6 : 4)} ${gx + 9},${GROUND}`;
  }
  return svg`
    ${Array.from(
      { length: BOARDS },
      (_, index) =>
        svg`<rect class="metal" x=${left} y=${(GATE_TOP + index * (boardHeight + BOARD_GAP)).toFixed(1)} width=${iw} height=${boardHeight.toFixed(1)} rx="2"></rect>`
    )}
    <rect class="metal" x=${left} y=${GATE_TOP} width="7" height=${height} rx="2"></rect>
    <rect class="metal" x=${left + iw - 7} y=${GATE_TOP} width="7" height=${height} rx="2"></rect>
    <path d=${`${grass} V${y + ih} Z`} fill=${`url(#${id}-grass)`}></path>
  `;
};

const renderDoor = (left: number) => {
  const { y, iw, ih } = VB;
  return svg`
    <rect class="fabric door" x=${left} y=${y} width=${iw} height=${ih}></rect>
    <rect class="panel" x=${left + 16} y=${y + 16} width=${iw - 32} height=${ih / 2 - 24}></rect>
    <rect class="panel" x=${left + 16} y=${y + ih / 2 + 8} width=${iw - 32} height=${ih / 2 - 24}></rect>
    <circle class="knob" cx=${left + iw - 14} cy=${y + ih / 2} r="4"></circle>
  `;
};

export const slideShape: CoverShape = {
  horizontal: true,
  render: ({ stateObj, value, handle, target, id }) => {
    const { x, y, ih } = VB;
    const left = x - (TRAVEL * value) / 100;
    const gate = stateObj.attributes.device_class === "gate";
    const handleY = gate ? GATE_TOP + (GROUND - GATE_TOP) / 2 : y + ih / 2;
    return {
      cover: gate ? renderGate(left, id) : renderDoor(left),
      ghost:
        target !== undefined
          ? targetLine(edge(target), y, edge(target), y + ih)
          : nothing,
      handle:
        handle !== undefined ? pill(edge(handle), handleY, true) : nothing,
    };
  },
  valueAt: (x) => ((VB.x + VB.iw - x) / TRAVEL) * 100,
};
