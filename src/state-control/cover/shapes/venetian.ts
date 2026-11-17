import { svg } from "lit";
import { clamp } from "../../../common/number/clamp";
import { coverBottom, rollingGeometry } from "./roller";
import type { CoverShape } from "./shared";
import { FRAME, clampPercent, headrail, slat } from "./shared";

const PITCH = 10;
const STACK_PITCH = 0.6;
const FLAT = 0.8;
const CORDS = [0.22, 0.78];

export const venetianShape: CoverShape = {
  ...rollingGeometry,
  render: ({ position, tilt }) => {
    const { left, top, width, height } = FRAME;
    const thickness = 9 - (7 * clampPercent(tilt)) / 100;
    const count = Math.ceil(height / PITCH) + 1;
    const first = top + thickness / 2;
    const pitch = (top + height - thickness / 2 - first) / (count - 1);
    const rail = coverBottom.coordAt(position);
    const centers = Array.from({ length: count }, (_, index) =>
      Math.max(
        first + index * STACK_PITCH,
        Math.min(
          first + index * pitch,
          rail - thickness / 2 - (count - 1 - index) * STACK_PITCH
        )
      )
    );
    const openness: number[] = [];
    for (let index = 0; index < count - 1; index++) {
      const gap = centers[index + 1] - centers[index] - STACK_PITCH;
      openness.push(clamp(gap / (pitch - STACK_PITCH), 0, 1));
    }
    openness.push(openness[count - 2]);
    const last = centers[count - 1];
    return {
      cover: svg`
        ${centers.map((center, index) => {
          const slatHeight = FLAT + (thickness - FLAT) * openness[index];
          return slat(center - Math.max(0.5, slatHeight / 2), slatHeight);
        })}
        ${CORDS.map(
          (fraction) =>
            svg`<rect class="cord" x=${(left + width * fraction - 0.7).toFixed(1)} y=${top} width="1.4" height=${(last + 1 - top).toFixed(1)}></rect>`
        )}
      `,
      front: headrail(8.8),
    };
  },
};
