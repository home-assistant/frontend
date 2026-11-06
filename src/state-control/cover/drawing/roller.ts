import type { SVGTemplateResult } from "lit";
import { nothing, svg } from "lit";
import type { CoverShape } from "./shared";
import { VB, ghost, headrail, horizontalEdge } from "./shared";

const HEADRAIL = 10.4;
const ROLL = 10;
const SHUTTER_SLAT = 12;
const GARAGE_PANELS = 5;

const shutterSlats = (height: number, open: boolean) => {
  const { x, y, iw } = VB;
  const parts: SVGTemplateResult[] = [];
  for (let ly = y + height - 4 - SHUTTER_SLAT; ly > y; ly -= SHUTTER_SLAT) {
    parts.push(
      svg`<line class="slat-line" x1=${x} y1=${ly.toFixed(1)} x2=${x + iw} y2=${ly.toFixed(1)}></line>`
    );
    if (open) {
      for (let sx = x + 8; sx < x + iw - 8; sx += 16) {
        parts.push(
          svg`<rect class="slot" x=${sx} y=${(ly - 1.2).toFixed(1)} width="7" height="2.4" rx="1.2"></rect>`
        );
      }
    }
  }
  return parts;
};

const garagePanels = (height: number) => {
  const { x, y, iw, ih } = VB;
  const panel = ih / GARAGE_PANELS;
  const chainTop = y + height - ih;
  const lintel = y + HEADRAIL;
  const parts: SVGTemplateResult[] = [];
  for (let index = 0; index < GARAGE_PANELS; index++) {
    const top = chainTop + index * panel;
    const bottom = top + panel;
    if (bottom <= lintel) {
      continue;
    }
    parts.push(
      top < lintel
        ? svg`<rect class="panel-shadow" x=${x} y=${lintel} width=${iw} height=${(bottom - lintel).toFixed(1)} opacity=${((0.22 * (lintel - top)) / panel).toFixed(3)}></rect>`
        : svg`<rect class="seam" x=${x} y=${(top - 0.8).toFixed(1)} width=${iw} height="1.6"></rect>`
    );
  }
  return parts;
};

export const rollY = (value: number) =>
  VB.y + ROLL + ((VB.ih - ROLL) * (100 - value)) / 100;

const gripY = (value: number) => rollY(value) - 2;

export const rollingGeometry: Pick<
  CoverShape,
  "grip" | "edge" | "silhouette" | "valueAt"
> = {
  grip: (value) => [VB.x + VB.iw / 2, gripY(value)],
  edge: (value) => horizontalEdge(gripY(value)),
  silhouette: (value) =>
    ghost(
      svg`<rect x=${VB.x} y=${VB.y} width=${VB.iw} height=${(rollY(value) - VB.y).toFixed(1)}></rect>`
    ),
  valueAt: (_x, y) => 100 - ((y - VB.y - ROLL) / (VB.ih - ROLL)) * 100,
};

export const rollerShape: CoverShape = {
  horizontal: false,
  openingAngle: 0,
  render: ({ stateObj, value, id }) => {
    const { x, y, iw } = VB;
    const height = rollY(value) - y;
    const deviceClass = stateObj.attributes.device_class;
    return {
      cover: svg`
        <rect class="fabric" x=${x} y=${y} width=${iw} height=${height.toFixed(1)}></rect>
        ${deviceClass === "shutter" ? shutterSlats(height, value > 0) : nothing}
        ${deviceClass === "garage" ? garagePanels(height) : nothing}
        <rect class="edge" x=${x} y=${(y + height - 4).toFixed(1)} width=${iw} height="4"></rect>
      `,
      front: headrail(id, HEADRAIL),
    };
  },
  ...rollingGeometry,
};
