import type { TooltipPositionCallback } from "echarts/types/dist/shared";

export const TOOLTIP_GAP_PX = 12;
export const TOOLTIP_TOP_OFFSET_PX = 10;

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
  x = Math.max(0, Math.min(x, viewW - tipW));

  const y = Math.max(0, Math.min(TOOLTIP_TOP_OFFSET_PX, viewH - tipH));

  return [x, y];
};
