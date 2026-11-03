import { nothing, svg } from "lit";
import type { CoverEntity } from "../../../data/cover";
import type { CoverShape } from "./shared";
import { VB, pill, slats, targetLine } from "./shared";

const ROLL = 10;

const rollY = (value: number) =>
  VB.y + ROLL + ((VB.ih - ROLL) * (100 - value)) / 100;

const lineSpacing = (stateObj: CoverEntity): number => {
  switch (stateObj.attributes.device_class) {
    case "shutter":
      return 7;
    case "garage":
      return 44;
    case "blind":
      return 18;
    default:
      return 0;
  }
};

const createRollerShape = (venetian: boolean): CoverShape => ({
  horizontal: false,
  render: ({ stateObj, value, tilt, handle, target }) => {
    const { x, y, iw } = VB;
    const height = rollY(value) - y;
    const spacing = venetian ? 0 : lineSpacing(stateObj);
    const lines: number[] = [];
    if (spacing) {
      for (let ly = y + height - spacing; ly > y; ly -= spacing) {
        lines.push(ly);
      }
    }
    return {
      cover: svg`
        ${
          venetian
            ? slats(y, height, tilt, 10)
            : svg`<rect class="fabric" x=${x} y=${y} width=${iw} height=${height.toFixed(1)}></rect>`
        }
        ${lines.map(
          (ly) =>
            svg`<line class="fabric-line" x1=${x} y1=${ly.toFixed(1)} x2=${x + iw} y2=${ly.toFixed(1)}></line>`
        )}
        <rect class="edge" x=${x} y=${(y + height - 5).toFixed(1)} width=${iw} height="6"></rect>
      `,
      ghost:
        target !== undefined
          ? targetLine(x, rollY(target), x + iw, rollY(target))
          : nothing,
      handle:
        handle !== undefined
          ? pill(x + iw / 2, rollY(handle) - 2, false)
          : nothing,
    };
  },
  valueAt: (_x, y) => 100 - ((y - VB.y - ROLL) / (VB.ih - ROLL)) * 100,
});

export const rollerShape = createRollerShape(false);

export const venetianShape = createRollerShape(true);
