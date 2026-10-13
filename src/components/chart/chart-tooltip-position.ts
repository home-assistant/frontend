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
