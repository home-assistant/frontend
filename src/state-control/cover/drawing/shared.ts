import type { SVGTemplateResult } from "lit";
import { nothing, svg } from "lit";
import type { CoverEntity } from "../../../data/cover";

export const VB = { w: 200, h: 200, x: 10, y: 10, iw: 180, ih: 180 };

export interface CoverWave {
  velocity: number;
  phase: number;
}

export interface CoverShapeInput {
  stateObj: CoverEntity;
  value: number;
  tilt: number;
  withHandle: boolean;
  wave: CoverWave;
  id: string;
}

type Part = SVGTemplateResult | SVGTemplateResult[] | typeof nothing;

export interface CoverShapeParts {
  back?: Part;
  cover: Part;
  front?: Part;
}

export interface CoverShape {
  horizontal: boolean;
  openingAngle?: number;
  render(input: CoverShapeInput): CoverShapeParts;
  grip(value: number): [number, number];
  edge?(value: number): string;
  silhouette?(value: number, id: string): SVGTemplateResult;
  knob?: boolean;
  valueAt(x: number, y: number): number;
}

export const clamp = (value: number) => Math.max(0, Math.min(100, value));

export const ghost = (shape: SVGTemplateResult, opacity = 0.22) =>
  svg`<g class="ghost" opacity=${opacity}>${shape}</g>`;

export const horizontalEdge = (y: number, inset = 0) =>
  `M${VB.x + inset} ${y.toFixed(1)} H${VB.x + VB.iw - inset}`;

export const headrail = (id: string, height: number) =>
  svg`<rect class="fabric" x=${VB.x} y=${VB.y} width=${VB.iw} height=${height} filter=${`url(#${id}-box)`}></rect>`;

export const stripes = (
  left: number,
  top: number,
  width: number,
  height: number
) =>
  [1, 3, 5].map(
    (column) =>
      svg`<rect class="stripe" x=${(left + (width * column) / 7).toFixed(1)} y=${top} width=${(width / 7).toFixed(1)} height=${Math.max(0, height).toFixed(1)}></rect>`
  );

export const slat = (top: number, thickness: number) => {
  const face = Math.max(0.4, thickness * 0.114);
  return svg`
    <rect class="fabric" x=${VB.x} y=${top.toFixed(2)} width=${VB.iw} height=${Math.max(1, thickness).toFixed(2)}></rect>
    ${
      thickness > 2.2
        ? svg`
            <rect class="seam" x=${VB.x} y=${(top + thickness - face).toFixed(2)} width=${VB.iw} height=${face.toFixed(2)}></rect>
            <rect class="lift" x=${VB.x} y=${top.toFixed(2)} width=${VB.iw} height=${(face * 0.55).toFixed(2)}></rect>
          `
        : nothing
    }
  `;
};
