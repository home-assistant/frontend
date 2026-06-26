import { describe, expect, it } from "vitest";
import {
  TOOLTIP_GAP_PX,
  TOOLTIP_TOP_OFFSET_PX,
  sideTooltipPosition,
} from "../../../src/components/chart/chart-tooltip-position";

const callPosition = (
  cursorX: number,
  options: {
    viewSize?: [number, number];
    contentSize?: [number, number];
    rtl?: boolean;
  } = {}
) => {
  const dom = document.createElement("div");
  if (options.rtl) {
    dom.setAttribute("dir", "rtl");
    document.body.appendChild(dom);
  }
  const result = sideTooltipPosition([cursorX, 0], [], dom, null, {
    viewSize: options.viewSize ?? [800, 400],
    contentSize: options.contentSize ?? [200, 120],
  }) as [number, number];
  if (options.rtl) {
    document.body.removeChild(dom);
  }
  return result;
};

describe("sideTooltipPosition", () => {
  it("places tooltip to the right of the cursor by default", () => {
    const [x, y] = callPosition(100);
    expect(x).toBe(100 + TOOLTIP_GAP_PX);
    expect(y).toBe(TOOLTIP_TOP_OFFSET_PX);
  });

  it("flips to the left when right side overflows the chart", () => {
    const [x] = callPosition(700, {
      viewSize: [800, 400],
      contentSize: [200, 120],
    });
    expect(x).toBe(700 - TOOLTIP_GAP_PX - 200);
  });

  it("clamps to chart bounds when neither side fits", () => {
    const [x] = callPosition(50, {
      viewSize: [120, 400],
      contentSize: [200, 120],
    });
    expect(x).toBe(0);
  });

  it("clamps Y when chart is shorter than the tooltip", () => {
    const [, y] = callPosition(100, {
      viewSize: [800, 100],
      contentSize: [200, 120],
    });
    expect(y).toBe(0);
  });

  it("prefers the left of the cursor in RTL mode", () => {
    const [x] = callPosition(400, { rtl: true });
    expect(x).toBe(400 - TOOLTIP_GAP_PX - 200);
  });
});
