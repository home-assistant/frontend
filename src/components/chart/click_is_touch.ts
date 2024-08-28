import type { ChartEvent } from "chart.js";

export const clickIsTouch = (event: ChartEvent): boolean =>
  !(event.native instanceof MouseEvent) ||
  (event.native instanceof PointerEvent &&
    event.native.pointerType !== "mouse");
