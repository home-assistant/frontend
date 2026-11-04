import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, headrail, slat } from "./shared";

const PITCH = 12;
const RAIL_X = VB.x + VB.iw - 14;
const RAIL_TOP = VB.y + 16;
const RAIL_HEIGHT = VB.ih - 32;

const railY = (value: number) => RAIL_TOP + RAIL_HEIGHT * (1 - value / 100);

export const slatsShape: CoverShape = {
  horizontal: false,
  knob: true,
  render: ({ tilt, withHandle, id }) => {
    const count = Math.floor(VB.ih / PITCH);
    const thickness = Math.max(1.2, (PITCH - 1) * (1 - tilt / 100));
    return {
      cover: svg`
        ${Array.from({ length: count }, (_, index) =>
          slat(VB.y + index * PITCH + (PITCH - thickness) / 2, thickness)
        )}
        ${
          withHandle
            ? svg`
                <rect class="rail" x=${RAIL_X - 3} y=${RAIL_TOP} width="6" height=${RAIL_HEIGHT} rx="3"></rect>
                <rect class="rail-fill" x=${RAIL_X - 3} y=${railY(tilt).toFixed(1)} width="6" height=${((RAIL_HEIGHT * tilt) / 100).toFixed(1)} rx="3"></rect>
              `
            : nothing
        }
      `,
      front: headrail(id, 8.8),
    };
  },
  grip: (value) => [RAIL_X, railY(value)],
  silhouette: (value) =>
    svg`<circle class="target" cx=${RAIL_X} cy=${railY(value)} r="9"></circle>`,
  valueAt: (_x, y) => ((RAIL_TOP + RAIL_HEIGHT - y) / RAIL_HEIGHT) * 100,
};
