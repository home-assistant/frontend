import { svg } from "lit";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { CoverEntity } from "../../../data/cover";
import { CoverEntityFeature } from "../../../data/cover";
import { rollY, rollingGeometry } from "./roller";
import type { CoverShape } from "./shared";
import { VB, clamp, headrail, slat } from "./shared";

const PITCH = 10;
const STACK_PITCH = 0.6;
const FLAT = 0.8;
const CORDS = [0.22, 0.78];

const supportsTilt = (stateObj: CoverEntity) =>
  supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
  supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT) ||
  supportsFeature(stateObj, CoverEntityFeature.SET_TILT_POSITION);

export const venetianShape: CoverShape = {
  horizontal: false,
  openingAngle: 0,
  render: ({ stateObj, value, tilt, id }) => {
    const { x, y, iw, ih } = VB;
    const angle = supportsTilt(stateObj) ? clamp(tilt) : 0;
    const thickness = 9 - (7 * angle) / 100;
    const count = Math.ceil(ih / PITCH) + 1;
    const first = y + thickness / 2;
    const pitch = (y + ih - thickness / 2 - first) / (count - 1);
    const rail = rollY(value);
    const centers = Array.from({ length: count }, (_, index) =>
      Math.max(
        first + index * STACK_PITCH,
        Math.min(
          first + index * pitch,
          rail - thickness / 2 - (count - 1 - index) * STACK_PITCH
        )
      )
    );
    const deployed: number[] = [];
    for (let index = 0; index < count - 1; index++) {
      const gap = centers[index + 1] - centers[index] - STACK_PITCH;
      deployed.push(clamp((gap / (pitch - STACK_PITCH)) * 100) / 100);
    }
    deployed.push(deployed[count - 2]);
    const last = centers[count - 1];
    return {
      cover: svg`
        ${centers.map((center, index) => {
          const height = FLAT + (thickness - FLAT) * deployed[index];
          return slat(center - Math.max(0.5, height / 2), height);
        })}
        ${CORDS.map(
          (fraction) =>
            svg`<rect class="cord" x=${(x + iw * fraction - 0.7).toFixed(1)} y=${y} width="1.4" height=${(last + 1 - y).toFixed(1)}></rect>`
        )}
      `,
      front: headrail(id, 8.8),
    };
  },
  ...rollingGeometry,
};
