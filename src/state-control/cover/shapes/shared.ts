import type { SVGTemplateResult } from "lit";
import { nothing, svg } from "lit";

export const VIEWBOX_SIZE = 200;

export const FRAME = {
  left: 10,
  top: 10,
  right: 190,
  bottom: 190,
  width: 180,
  height: 180,
  centerX: 100,
  centerY: 100,
} as const;

export interface CoverWave {
  velocity: number;
  phase: number;
}

export interface CoverShapeInput {
  position: number;
  tilt: number;
  wave: CoverWave;
  id: string;
}

type Part = SVGTemplateResult | SVGTemplateResult[] | typeof nothing;

export interface CoverShapeParts {
  back?: Part;
  cover: Part;
  front?: Part;
}

export type OpeningDirection = "up" | "down" | "left";

export interface CoverShape {
  opens: OpeningDirection;
  handle?: "pill" | "gauge";
  render(input: CoverShapeInput): CoverShapeParts;
  handleAt(value: number): [number, number];
  valueAt(x: number, y: number): number;
  targetLine?(value: number): string;
  targetShape?(value: number, id: string): SVGTemplateResult;
}

export const isHorizontal = (shape: CoverShape) => shape.opens === "left";

export const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, value));

export const valueAxis = (atEmpty: number, atFull: number) => ({
  coordAt: (value: number) => atEmpty + ((atFull - atEmpty) * value) / 100,
  valueAt: (coord: number) => ((coord - atEmpty) / (atFull - atEmpty)) * 100,
});

const tiltAxis = valueAxis(FRAME.bottom - 16, FRAME.top + 16);

export const tiltGeometry: Pick<
  CoverShape,
  "opens" | "handle" | "handleAt" | "valueAt"
> = {
  opens: "up",
  handle: "gauge",
  handleAt: (value) => [FRAME.right - 14, tiltAxis.coordAt(value)],
  valueAt: (_x, y) => tiltAxis.valueAt(y),
};

export const ghost = (shape: SVGTemplateResult, opacity = 0.22) =>
  svg`<g class="ghost" opacity=${opacity}>${shape}</g>`;

export const horizontalLine = (y: number, inset = 0) =>
  `M${FRAME.left + inset} ${y.toFixed(1)} H${FRAME.right - inset}`;

export const headrail = (id: string, height: number) =>
  svg`<rect class="fabric" x=${FRAME.left} y=${FRAME.top} width=${FRAME.width} height=${height} filter=${`url(#${id}-box)`}></rect>`;

export const slat = (top: number, thickness: number) => {
  const face = Math.max(0.4, thickness * 0.114);
  return svg`
    <rect class="fabric" x=${FRAME.left} y=${top.toFixed(2)} width=${FRAME.width} height=${Math.max(1, thickness).toFixed(2)}></rect>
    ${
      thickness > 2.2
        ? svg`
            <rect class="seam" x=${FRAME.left} y=${(top + thickness - face).toFixed(2)} width=${FRAME.width} height=${face.toFixed(2)}></rect>
            <rect class="lift" x=${FRAME.left} y=${top.toFixed(2)} width=${FRAME.width} height=${(face * 0.55).toFixed(2)}></rect>
          `
        : nothing
    }
  `;
};
