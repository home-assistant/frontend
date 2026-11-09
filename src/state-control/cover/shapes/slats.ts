import type { CoverShape } from "./shared";
import { FRAME, slat, tiltGeometry } from "./shared";

const PITCH = 12;

export const slatsShape: CoverShape = {
  ...tiltGeometry,
  render: ({ tilt }) => {
    const count = Math.floor(FRAME.height / PITCH);
    const thickness = Math.max(1.2, (PITCH - 1) * (1 - tilt / 100));
    return {
      cover: Array.from({ length: count }, (_, index) =>
        slat(FRAME.top + index * PITCH + (PITCH - thickness) / 2, thickness)
      ),
    };
  },
};
