import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, slats } from "./shared";

const RAIL_X = VB.x + VB.iw - 14;
const RAIL_TOP = VB.y + 16;
const RAIL_HEIGHT = VB.ih - 32;

const railY = (value: number) => RAIL_TOP + RAIL_HEIGHT * (1 - value / 100);

export const slatsShape: CoverShape = {
  horizontal: false,
  render: ({ tilt, handle, target }) => ({
    cover: svg`
      ${slats(VB.y, VB.ih, tilt, 12)}
      ${
        handle !== undefined
          ? svg`
              <rect class="rail" x=${RAIL_X - 3} y=${RAIL_TOP} width="6" height=${RAIL_HEIGHT} rx="3"></rect>
              <rect class="rail-fill" x=${RAIL_X - 3} y=${railY(tilt).toFixed(1)} width="6" height=${((RAIL_HEIGHT * tilt) / 100).toFixed(1)} rx="3"></rect>
            `
          : nothing
      }
    `,
    ghost:
      target !== undefined
        ? svg`<circle class="target" cx=${RAIL_X} cy=${railY(target)} r="9" fill="none"></circle>`
        : nothing,
    handle:
      handle !== undefined
        ? svg`<circle class="knob-handle" cx=${RAIL_X} cy=${railY(handle)} r="9"></circle>`
        : nothing,
  }),
  valueAt: (_x, y) => ((RAIL_TOP + RAIL_HEIGHT - y) / RAIL_HEIGHT) * 100,
};
