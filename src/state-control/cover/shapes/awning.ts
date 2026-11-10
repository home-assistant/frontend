import { svg } from "lit";
import type { CoverShape } from "./shared";
import { FRAME, ghost, headrail, valueAxis } from "./shared";

const SCALLOPS = 8;
const SCALLOP_WIDTH = FRAME.width / SCALLOPS;
const MIN_EXTENT = 8;

const hem = valueAxis(FRAME.top, FRAME.top + FRAME.height * 0.9);

const hemY = (value: number) =>
  Math.max(FRAME.top + MIN_EXTENT, hem.coordAt(value));

const scallops = (bottom: number) => {
  let path = "";
  for (let index = SCALLOPS; index > 0; index--) {
    path += ` Q${FRAME.left + (index - 0.5) * SCALLOP_WIDTH},${bottom + 6} ${FRAME.left + (index - 1) * SCALLOP_WIDTH},${bottom}`;
  }
  return path;
};

const outline = (bottom: number) =>
  `M${FRAME.left},${FRAME.top} H${FRAME.right} V${bottom}${scallops(bottom)} Z`;

export const awningShape: CoverShape = {
  opens: "down",
  render: ({ position }) => {
    const bottom = hemY(position);
    return {
      cover: svg`
        <path class="fabric" d=${outline(bottom)}></path>
        ${Array.from(
          { length: SCALLOPS - 1 },
          (_, index) =>
            svg`<rect class="seam faint" x=${(FRAME.left + (index + 1) * SCALLOP_WIDTH - 0.3).toFixed(1)} y=${FRAME.top} width="0.6" height=${(bottom - FRAME.top).toFixed(1)}></rect>`
        )}
      `,
      front: headrail(10.4),
    };
  },
  handleAt: (value) => [FRAME.centerX, hemY(value)],
  valueAt: (_x, y) => hem.valueAt(y),
  targetLine: (value) => {
    const bottom = hemY(value);
    return `M${FRAME.right},${bottom}${scallops(bottom)}`;
  },
  targetShape: (value) => ghost(svg`<path d=${outline(hemY(value))}></path>`),
};
