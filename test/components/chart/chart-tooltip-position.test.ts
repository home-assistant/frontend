import { afterEach, describe, expect, it } from "vitest";
import {
  TOOLTIP_GAP_PX,
  TOOLTIP_TOP_OFFSET_PX,
  WINDOW_MARGIN_PX,
  sideTooltipPosition,
  windowTooltipPosition,
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

describe("windowTooltipPosition", () => {
  const setWindowSize = (width: number, height: number) => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: width,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: height,
    });
  };

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, "clientWidth");
    Reflect.deleteProperty(document.documentElement, "clientHeight");
  });

  const callWindowPosition = (
    cursor: [number, number],
    contentSize: [number, number],
    {
      chart = new DOMRect(100, 400, 1000, 350),
      confine = false,
    }: { chart?: DOMRect; confine?: boolean } = {}
  ) => {
    setWindowSize(1440, 900);
    return windowTooltipPosition(() => chart, confine)(
      cursor,
      [],
      document.createElement("div"),
      null,
      { viewSize: [chart.width, chart.height], contentSize }
    ) as [number, number];
  };

  it("keeps the ECharts position when it fits the window", () => {
    expect(callWindowPosition([100, 300], [200, 260])).toEqual([120, 20]);
  });

  it("opens below the cursor when above leaves the window", () => {
    expect(
      callWindowPosition([100, 300], [200, 400], {
        chart: new DOMRect(100, 50, 1000, 350),
      })
    ).toEqual([120, 320]);
  });

  it("opens right of the cursor when left leaves the window", () => {
    const [x] = callWindowPosition([100, 100], [260, 100], {
      chart: new DOMRect(16, 400, 300, 350),
    });
    expect(x).toBe(100 + 20);
  });

  it("pins a tooltip taller than the window to the window top", () => {
    const [, y] = callWindowPosition([300, 300], [300, 1200]);
    expect(y).toBe(WINDOW_MARGIN_PX - 400);
  });

  it("moves a confined tooltip out of the chart only as far as the window needs", () => {
    const chart = new DOMRect(0, 700, 400, 400);
    const [x, y] = callWindowPosition([380, 20], [200, 250], {
      chart,
      confine: true,
    });
    expect(y).toBe(900 - WINDOW_MARGIN_PX - 700 - 250);
    expect(x).toBe(380 - 20 - 200);
  });

  it("keeps a confined tooltip above the chart bottom", () => {
    const chart = new DOMRect(0, -100, 400, 400);
    const [, y] = callWindowPosition([100, 260], [200, 150], {
      chart,
      confine: true,
    });
    expect(y).toBe(WINDOW_MARGIN_PX + 100);
  });

  it("moves a confined tooltip into the visible part of the chart", () => {
    const chart = new DOMRect(0, 600, 400, 400);
    const [, y] = callWindowPosition([100, 200], [200, 150], {
      chart,
      confine: true,
    });
    expect(y).toBe(200 - 20 - 150);
  });
});
