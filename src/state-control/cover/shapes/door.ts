import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { FRAME, ghost } from "./shared";

const MAX_ANGLE = (80 * Math.PI) / 180;

const DOOR = (() => {
  const width = FRAME.width * 0.42;
  const height = FRAME.height * 0.78;
  const left = FRAME.left + (FRAME.width - width) / 2;
  const top = FRAME.bottom - height - FRAME.height * 0.07;
  return { left, top, width, height, right: left + width };
})();

const FLOOR = DOOR.top + DOOR.height;

const WALL = `M${FRAME.left},${FRAME.top} H${FRAME.right} V${FLOOR} H${FRAME.left} Z M${DOOR.left},${DOOR.top} V${FLOOR} H${DOOR.right} V${DOOR.top} Z`;

const leaf = (value: number) => {
  const swing = value / 100;
  const angle = swing * MAX_ANGLE;
  const depth = 1 / (1 + Math.sin(angle) / 2);
  const narrow = 1 - 0.2 * Math.min(1, swing / 0.3);
  const width = Math.max(
    DOOR.width * 0.06,
    DOOR.width * Math.cos(angle) * depth * narrow
  );
  const shrink = DOOR.height * (1 - depth);
  const topInset = shrink * 0.42;
  const bottomInset = shrink * 0.58;
  const freeX = DOOR.left + width;
  return {
    width,
    topInset,
    bottomInset,
    freeX,
    points: `${DOOR.left},${DOOR.top} ${freeX.toFixed(1)},${(DOOR.top + topInset).toFixed(1)} ${freeX.toFixed(1)},${(FLOOR - bottomInset).toFixed(1)} ${DOOR.left},${FLOOR}`,
  };
};

const CLOSED_X = leaf(0).freeX;
const OPEN_X = leaf(100).freeX;
const X_PER_STEP = (CLOSED_X - OPEN_X) / 100;

const wallStripes = () =>
  [1, 3, 5].map(
    (column) =>
      svg`<rect class="stripe" x=${(FRAME.left + (FRAME.width * column) / 7).toFixed(1)} y=${FRAME.top} width=${(FRAME.width / 7).toFixed(1)} height=${(FLOOR - FRAME.top).toFixed(1)}></rect>`
  );

const hingeShade = (value: number, id: string) => {
  const swing = value / 100;
  if (swing <= 0.01) {
    return nothing;
  }
  const { width, topInset, bottomInset } = leaf(value);
  const strength = 0.16 * Math.min(1, swing * 1.6);
  const shadeX = (DOOR.left + 0.4 * width).toFixed(1);
  return svg`
    <linearGradient id=${`${id}-hinge`} x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#000" stop-opacity=${strength.toFixed(3)}></stop>
    </linearGradient>
    <polygon
      points=${`${DOOR.left},${DOOR.top} ${shadeX},${(DOOR.top + 0.4 * topInset).toFixed(1)} ${shadeX},${(FLOOR - 0.4 * bottomInset).toFixed(1)} ${DOOR.left},${FLOOR}`}
      fill=${`url(#${id}-hinge)`}
    ></polygon>
  `;
};

export const doorShape: CoverShape = {
  opens: "left",
  render: ({ position, id }) => {
    const groundHeight = (FRAME.bottom - FLOOR).toFixed(1);
    return {
      back: svg`
        <path class="fabric" d=${WALL} fill-rule="evenodd"></path>
        <clipPath id=${`${id}-wall`}><path d=${WALL} clip-rule="evenodd"></path></clipPath>
        <g clip-path=${`url(#${id}-wall)`}>${wallStripes()}</g>
        <rect class="fabric" x=${FRAME.left} y=${FLOOR} width=${FRAME.width} height=${groundHeight}></rect>
        <rect class="floor" x=${FRAME.left} y=${FLOOR} width=${FRAME.width} height=${groundHeight}></rect>
        <clipPath id=${`${id}-door`}><rect x=${DOOR.left} y=${DOOR.top} width=${DOOR.width} height=${DOOR.height}></rect></clipPath>
      `,
      cover: svg`
        <g clip-path=${`url(#${id}-door)`}>
          <polygon class="door" points=${leaf(position).points}></polygon>
          ${hingeShade(position, id)}
        </g>
      `,
      front: svg`<path class="door-frame" d=${`M${DOOR.left - 2.5} ${FLOOR} V${DOOR.top - 2.5} H${DOOR.right + 2.5} V${FLOOR}`}></path>`,
    };
  },
  handleAt: (value) => [leaf(value).freeX, DOOR.top + DOOR.height / 2],
  valueAt: (x) => {
    if (x >= CLOSED_X) {
      return -(x - CLOSED_X) / X_PER_STEP;
    }
    if (x <= OPEN_X) {
      return 100 + (OPEN_X - x) / X_PER_STEP;
    }
    let best = 0;
    for (let value = 1; value <= 100; value++) {
      if (Math.abs(leaf(value).freeX - x) < Math.abs(leaf(best).freeX - x)) {
        best = value;
      }
    }
    return best;
  },
  targetLine: (value) => {
    const { freeX, topInset, bottomInset } = leaf(value);
    return `M${freeX.toFixed(1)} ${(DOOR.top + topInset).toFixed(1)} V${(FLOOR - bottomInset).toFixed(1)}`;
  },
  targetShape: (value, id) => svg`
    <g clip-path=${`url(#${id}-door)`}>
      ${ghost(svg`<polygon points=${leaf(value).points}></polygon>`, 0.45)}
    </g>
  `,
};
