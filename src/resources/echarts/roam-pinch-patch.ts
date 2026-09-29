// Patch ECharts RoamController so pinch zoom follows the fingers.
//
// ECharts zooms by a fixed 10% step on every touchmove of a pinch, whatever
// the fingers actually moved, so the zoom speed depends on the event rate
// rather than the gesture. This zooms by the real change in finger distance
// around the pinch center instead.
//
// The patch is applied once at module load time, before any chart is created.

import RoamController from "echarts/lib/component/helper/RoamController";
import { isTaken } from "echarts/lib/component/helper/interactionMutex";

// Guards against a jump when the finger distance is tiny or glitches.
const MAX_PINCH_STEP = 2;

const isAvailableBehavior = () => true;

(RoamController as any).prototype._pinchHandler = function (e: any): void {
  if (isTaken(this._zr, "globalPan") || e.__ecRoamConsumed) {
    return;
  }
  // Every pinch event on the chart is cancelled, including the ones that do
  // not zoom or whose center is off the plot area, like over the axis labels,
  // or the browser takes over the gesture and scrolls or zooms the page. Only
  // a pinch over the plot area stops propagating, as it does in ECharts.
  e.event.preventDefault();
  const x: number = e.pinchX;
  const y: number = e.pinchY;
  if (!this._checkPointer(e, x, y)) {
    return;
  }
  e.event.stopPropagation();
  e.__ecRoamConsumed = true;

  // A finger was added or lifted, so the distance jumps without a real move
  if (e.event?.type !== "touchmove") {
    return;
  }
  const scale = Math.min(
    MAX_PINCH_STEP,
    Math.max(1 / MAX_PINCH_STEP, e.pinchScale)
  );
  if (scale !== 1) {
    this.trigger("zoom", {
      scale,
      originX: x,
      originY: y,
      isAvailableBehavior,
    });
  }
};
