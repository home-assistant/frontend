import type { nothing, SVGTemplateResult } from "lit";
import { svg } from "lit";
import type { CoverEntity } from "../../../data/cover";

export const VB = { w: 200, h: 250, x: 14, y: 14, iw: 172, ih: 222 };

export interface CoverShapeInput {
  stateObj: CoverEntity;
  value: number;
  tilt: number;
  handle?: number;
  target?: number;
  id: string;
}

export interface CoverShapeParts {
  cover: SVGTemplateResult;
  ghost: SVGTemplateResult | typeof nothing;
  handle: SVGTemplateResult | typeof nothing;
}

export interface CoverShape {
  horizontal: boolean;
  render(input: CoverShapeInput): CoverShapeParts;
  valueAt(x: number, y: number): number;
}

export const pill = (cx: number, cy: number, vertical: boolean) =>
  vertical
    ? svg`<rect class="handle" x=${cx - 4} y=${cy - 22} width="8" height="44" rx="4"></rect>`
    : svg`<rect class="handle" x=${cx - 24} y=${cy - 4} width="48" height="8" rx="4"></rect>`;

export const targetLine = (x1: number, y1: number, x2: number, y2: number) =>
  svg`<line class="target" x1=${x1} y1=${y1} x2=${x2} y2=${y2}></line>`;

export const slats = (
  top: number,
  height: number,
  angle: number,
  gap: number
) => {
  const count = Math.floor(height / gap);
  const thickness = Math.max(1.2, (gap - 1) * (1 - angle / 100));
  return Array.from(
    { length: count },
    (_, index) =>
      svg`<rect class="slat" x=${VB.x} y=${(top + index * gap + (gap - thickness) / 2).toFixed(1)} width=${VB.iw} height=${thickness.toFixed(1)}></rect>`
  );
};
