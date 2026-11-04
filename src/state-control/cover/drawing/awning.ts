import { svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, ghost, headrail } from "./shared";

const SCALLOPS = 8;
const REACH = VB.ih * 0.9;

const extent = (value: number) => Math.max(8, (REACH * value) / 100);

const scallops = (height: number) => {
  const { x, y, iw } = VB;
  const width = iw / SCALLOPS;
  let path = "";
  for (let index = SCALLOPS; index > 0; index--) {
    path += ` Q${x + (index - 0.5) * width},${y + height + 6} ${x + (index - 1) * width},${y + height}`;
  }
  return path;
};

const outline = (height: number) =>
  `M${VB.x},${VB.y} H${VB.x + VB.iw} V${VB.y + height}${scallops(height)} Z`;

export const awningShape: CoverShape = {
  horizontal: false,
  openingAngle: 180,
  render: ({ value, id }) => {
    const { x, y, iw } = VB;
    const height = extent(value);
    const width = iw / SCALLOPS;
    return {
      cover: svg`
        <path class="fabric" d=${outline(height)}></path>
        ${Array.from(
          { length: SCALLOPS - 1 },
          (_, index) =>
            svg`<rect class="seam faint" x=${(x + (index + 1) * width - 0.3).toFixed(1)} y=${y} width="0.6" height=${height.toFixed(1)}></rect>`
        )}
      `,
      front: headrail(id, 10.4),
    };
  },
  grip: (value) => [VB.x + VB.iw / 2, VB.y + extent(value)],
  edge: (value) =>
    `M${VB.x + VB.iw},${VB.y + extent(value)}${scallops(extent(value))}`,
  silhouette: (value) => ghost(svg`<path d=${outline(extent(value))}></path>`),
  valueAt: (_x, y) => ((y - VB.y) / REACH) * 100,
};
