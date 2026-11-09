import type { SVGTemplateResult } from "lit";
import { svg } from "lit";
import type { CoverShape } from "./shared";
import { FRAME, ghost, headrail, horizontalLine, valueAxis } from "./shared";

const HEADRAIL = 10.4;
const ROLL = 10;
const BOTTOM_BAR = 4;
const HANDLE_INSET = 2;
const SHUTTER_SLAT = 12;
const GARAGE_PANELS = 5;

export const coverBottom = valueAxis(FRAME.bottom, FRAME.top + ROLL);

const handleY = (value: number) => coverBottom.coordAt(value) - HANDLE_INSET;

export const rollingGeometry: Pick<
  CoverShape,
  "opens" | "handleAt" | "valueAt" | "targetLine" | "targetShape"
> = {
  opens: "up",
  handleAt: (value) => [FRAME.centerX, handleY(value)],
  valueAt: (_x, y) => coverBottom.valueAt(y + HANDLE_INSET),
  targetLine: (value) => horizontalLine(handleY(value)),
  targetShape: (value) =>
    ghost(
      svg`<rect x=${FRAME.left} y=${FRAME.top} width=${FRAME.width} height=${(coverBottom.coordAt(value) - FRAME.top).toFixed(1)}></rect>`
    ),
};

const rollingShape = (
  details: (bottom: number, position: number) => SVGTemplateResult[] = () => []
): CoverShape => ({
  ...rollingGeometry,
  render: ({ position, id }) => {
    const bottom = coverBottom.coordAt(position);
    return {
      cover: svg`
        <rect class="fabric" x=${FRAME.left} y=${FRAME.top} width=${FRAME.width} height=${(bottom - FRAME.top).toFixed(1)}></rect>
        ${details(bottom, position)}
        <rect class="bottom-bar" x=${FRAME.left} y=${(bottom - BOTTOM_BAR).toFixed(1)} width=${FRAME.width} height=${BOTTOM_BAR}></rect>
      `,
      front: headrail(id, HEADRAIL),
    };
  },
});

const shutterSlats = (bottom: number, position: number) => {
  const parts: SVGTemplateResult[] = [];
  for (
    let lineY = bottom - BOTTOM_BAR - SHUTTER_SLAT;
    lineY > FRAME.top;
    lineY -= SHUTTER_SLAT
  ) {
    parts.push(
      svg`<line class="slat-line" x1=${FRAME.left} y1=${lineY.toFixed(1)} x2=${FRAME.right} y2=${lineY.toFixed(1)}></line>`
    );
    if (position > 0) {
      for (let slotX = FRAME.left + 8; slotX < FRAME.right - 8; slotX += 16) {
        parts.push(
          svg`<rect class="slot" x=${slotX} y=${(lineY - 1.2).toFixed(1)} width="7" height="2.4" rx="1.2"></rect>`
        );
      }
    }
  }
  return parts;
};

const garagePanels = (bottom: number) => {
  const panelHeight = FRAME.height / GARAGE_PANELS;
  const firstPanelTop = bottom - FRAME.height;
  const lintel = FRAME.top + HEADRAIL;
  const parts: SVGTemplateResult[] = [];
  for (let index = 0; index < GARAGE_PANELS; index++) {
    const top = firstPanelTop + index * panelHeight;
    const panelBottom = top + panelHeight;
    if (panelBottom <= lintel) {
      continue;
    }
    parts.push(
      top < lintel
        ? svg`<rect class="panel-shadow" x=${FRAME.left} y=${lintel} width=${FRAME.width} height=${(panelBottom - lintel).toFixed(1)} opacity=${((0.22 * (lintel - top)) / panelHeight).toFixed(3)}></rect>`
        : svg`<rect class="seam" x=${FRAME.left} y=${(top - 0.8).toFixed(1)} width=${FRAME.width} height="1.6"></rect>`
    );
  }
  return parts;
};

export const rollerShape = rollingShape();

export const shutterShape = rollingShape(shutterSlats);

export const garageShape = rollingShape(garagePanels);
