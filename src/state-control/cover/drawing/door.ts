import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, ghost, stripes } from "./shared";

const ANGLE = (80 * Math.PI) / 180;

const DOOR = (() => {
  const { x, y, iw, ih } = VB;
  const w = iw * 0.42;
  const h = ih * 0.78;
  return { x: x + (iw - w) / 2, y: y + ih - h - ih * 0.07, w, h };
})();

const FLOOR = DOOR.y + DOOR.h;

const leaf = (value: number) => {
  const swing = value / 100;
  const angle = swing * ANGLE;
  const depth = 1 / (1 + Math.sin(angle) / 2);
  const narrow = 1 - 0.2 * Math.min(1, swing / 0.3);
  const width = Math.max(
    DOOR.w * 0.06,
    DOOR.w * Math.cos(angle) * depth * narrow
  );
  const shrink = DOOR.h * (1 - depth);
  const top = shrink * 0.42;
  const bottom = shrink * 0.58;
  const edge = DOOR.x + width;
  return {
    width,
    top,
    bottom,
    edge,
    points: `${DOOR.x},${DOOR.y} ${edge.toFixed(1)},${(DOOR.y + top).toFixed(1)} ${edge.toFixed(1)},${(FLOOR - bottom).toFixed(1)} ${DOOR.x},${FLOOR}`,
  };
};

const CLOSED_EDGE = leaf(0).edge;
const OPEN_EDGE = leaf(100).edge;
const EDGE_PER_STEP = (CLOSED_EDGE - OPEN_EDGE) / 100;

const hingeShade = (value: number, id: string) => {
  const swing = value / 100;
  if (swing <= 0.01) {
    return nothing;
  }
  const { width, top, bottom } = leaf(value);
  const strength = 0.16 * Math.min(1, swing * 1.6);
  const tx = (DOOR.x + 0.4 * width).toFixed(1);
  return svg`
    <linearGradient id=${`${id}-hinge`} x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#000" stop-opacity=${strength.toFixed(3)}></stop>
    </linearGradient>
    <polygon
      points=${`${DOOR.x},${DOOR.y} ${tx},${(DOOR.y + 0.4 * top).toFixed(1)} ${tx},${(FLOOR - 0.4 * bottom).toFixed(1)} ${DOOR.x},${FLOOR}`}
      fill=${`url(#${id}-hinge)`}
    ></polygon>
  `;
};

export const doorShape: CoverShape = {
  horizontal: true,
  openingAngle: -90,
  render: ({ value, id }) => {
    const { x, y, iw, ih } = VB;
    const wall = `M${x},${y} H${x + iw} V${FLOOR} H${x} Z M${DOOR.x},${DOOR.y} V${FLOOR} H${DOOR.x + DOOR.w} V${DOOR.y} Z`;
    const opening = svg`<clipPath id=${`${id}-door`}><rect x=${DOOR.x} y=${DOOR.y} width=${DOOR.w} height=${DOOR.h}></rect></clipPath>`;
    return {
      back: svg`
        <path class="fabric" d=${wall} fill-rule="evenodd"></path>
        <clipPath id=${`${id}-wall`}><path d=${wall} clip-rule="evenodd"></path></clipPath>
        <g clip-path=${`url(#${id}-wall)`}>${stripes(x, y, iw, FLOOR - y)}</g>
        <rect class="fabric" x=${x} y=${FLOOR} width=${iw} height=${(y + ih - FLOOR).toFixed(1)}></rect>
        <rect class="floor" x=${x} y=${FLOOR} width=${iw} height=${(y + ih - FLOOR).toFixed(1)}></rect>
        ${opening}
      `,
      cover: svg`
        <g clip-path=${`url(#${id}-door)`}>
          <polygon class="door" points=${leaf(value).points}></polygon>
          ${hingeShade(value, id)}
        </g>
      `,
      front: svg`<path class="door-frame" d=${`M${DOOR.x - 2.5} ${FLOOR} V${DOOR.y - 2.5} H${DOOR.x + DOOR.w + 2.5} V${FLOOR}`}></path>`,
    };
  },
  grip: (value) => [leaf(value).edge, DOOR.y + DOOR.h / 2],
  edge: (value) => {
    const { edge, top, bottom } = leaf(value);
    return `M${edge.toFixed(1)} ${(DOOR.y + top).toFixed(1)} V${(FLOOR - bottom).toFixed(1)}`;
  },
  silhouette: (value, id) => svg`
    <g clip-path=${`url(#${id}-door)`}>
      ${ghost(svg`<polygon points=${leaf(value).points}></polygon>`, 0.45)}
    </g>
  `,
  valueAt: (x) => {
    if (x >= CLOSED_EDGE) {
      return -(x - CLOSED_EDGE) / EDGE_PER_STEP;
    }
    if (x <= OPEN_EDGE) {
      return 100 + (OPEN_EDGE - x) / EDGE_PER_STEP;
    }
    let best = 0;
    for (let value = 1; value <= 100; value++) {
      if (Math.abs(leaf(value).edge - x) < Math.abs(leaf(best).edge - x)) {
        best = value;
      }
    }
    return best;
  },
};
