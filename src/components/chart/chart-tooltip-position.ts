import type { TooltipPositionCallback } from "echarts/types/dist/shared";

export const TOOLTIP_GAP_PX = 12;
export const TOOLTIP_TOP_OFFSET_PX = 10;

const offsetFromCursor = (
  cursorX: number,
  dom: unknown,
  viewW: number,
  tipW: number
) => {
  const rtl =
    dom instanceof HTMLElement && getComputedStyle(dom).direction === "rtl";

  const rightOfCursor = cursorX + TOOLTIP_GAP_PX;
  const leftOfCursor = cursorX - TOOLTIP_GAP_PX - tipW;

  let x = rtl ? leftOfCursor : rightOfCursor;
  const overflowsRight = x + tipW > viewW;
  const overflowsLeft = x < 0;
  if (overflowsRight || overflowsLeft) {
    x = rtl ? rightOfCursor : leftOfCursor;
  }
  return Math.max(0, Math.min(x, viewW - tipW));
};

/**
 * Pins the tooltip near the top of the chart and offsets it horizontally
 * from the cursor so it never covers the data point being inspected.
 * For axis-trigger time-series tooltips where the cursor's Y is uncorrelated
 * with the displayed content.
 */
export const sideTooltipPosition: TooltipPositionCallback = (
  point,
  _params,
  dom,
  _rect,
  size
) => {
  const [cursorX] = point;
  const [viewW, viewH] = size.viewSize;
  const [tipW, tipH] = size.contentSize;

  const x = offsetFromCursor(cursorX, dom, viewW, tipW);
  const y = Math.max(0, Math.min(TOOLTIP_TOP_OFFSET_PX, viewH - tipH));

  return [x, y];
};

/**
 * Offsets the tooltip horizontally from the cursor and keeps it level with it.
 * For item-trigger tooltips where the cursor's row is what the tooltip shows.
 */
export const itemTooltipPosition: TooltipPositionCallback = (
  point,
  _params,
  dom,
  _rect,
  size
) => {
  const [cursorX, cursorY] = point;
  const [viewW, viewH] = size.viewSize;
  const [tipW, tipH] = size.contentSize;

  const x = offsetFromCursor(cursorX, dom, viewW, tipW);
  const y = Math.max(0, Math.min(cursorY - tipH / 2, viewH - tipH));

  return [x, y];
};

const ECHARTS_TOOLTIP_GAP_PX = 20;
export const WINDOW_MARGIN_PX = 8;

const fitInto = (
  pos: number,
  size: number,
  alternatives: number[],
  min: number,
  max: number
) =>
  size > max - min
    ? min
    : ([pos, ...alternatives].find((p) => p >= min && p + size <= max) ??
      Math.max(min, Math.min(pos, max - size)));

/**
 * ECharts' default placement (or the chart-confined one), moved into the
 * window when it would leave it. The other side of the cursor is tried before
 * clamping, below first vertically. A tooltip taller than the window starts at
 * its top. A confined tooltip never leaves the chart.
 */
export const windowTooltipPosition =
  (
    getChartRect: () => DOMRect | undefined,
    confine: boolean
  ): TooltipPositionCallback =>
  (point, _params, _dom, _rect, size) => {
    const [cursorX, cursorY] = point;
    const [viewW, viewH] = size.viewSize;
    const [tipW, tipH] = size.contentSize;

    const right = cursorX + ECHARTS_TOOLTIP_GAP_PX;
    const left = cursorX - ECHARTS_TOOLTIP_GAP_PX - tipW;
    const below = cursorY + ECHARTS_TOOLTIP_GAP_PX;
    const above = cursorY - ECHARTS_TOOLTIP_GAP_PX - tipH;
    let x = right + tipW + 2 > viewW ? left : right;
    let y = below + tipH > viewH ? above : below;
    if (confine) {
      x = Math.max(0, Math.min(x, viewW - tipW));
      y = Math.max(0, Math.min(y, viewH - tipH));
    }

    const rect = getChartRect();
    if (!rect?.height) {
      return [x, y];
    }
    const fit = (
      pos: number,
      tipSize: number,
      alternatives: number[],
      windowMin: number,
      windowMax: number,
      viewSize: number
    ) => {
      if (!confine) {
        return fitInto(pos, tipSize, alternatives, windowMin, windowMax);
      }
      const min = Math.max(0, windowMin);
      const max = Math.min(viewSize, windowMax);
      return tipSize > max - min
        ? pos
        : fitInto(pos, tipSize, alternatives, min, max);
    };
    const { clientWidth, clientHeight } = document.documentElement;
    return [
      fit(
        x,
        tipW,
        [right, left],
        WINDOW_MARGIN_PX - rect.left,
        clientWidth - WINDOW_MARGIN_PX - rect.left,
        viewW
      ),
      fit(
        y,
        tipH,
        [below, above],
        WINDOW_MARGIN_PX - rect.top,
        clientHeight - WINDOW_MARGIN_PX - rect.top,
        viewH
      ),
    ];
  };
