import { beforeAll, describe, expect, it, vi } from "vitest";
import RoamController from "echarts/lib/component/helper/RoamController";

/**
 * These tests verify that the ECharts internals our roam-pinch-patch relies on
 * still exist, and that pinch events reach the patched handler. If an ECharts
 * upgrade changes these, pinch zoom would silently go back to fixed steps, so
 * the patch in src/resources/echarts/roam-pinch-patch.ts needs to be updated.
 */
describe("ECharts internals required by roam-pinch-patch", () => {
  it("RoamController has the methods the patch uses on its prototype", () => {
    const proto = (RoamController as any).prototype;
    expect(typeof proto._pinchHandler).toBe("function");
    expect(typeof proto._checkPointer).toBe("function");
    expect(typeof proto.trigger).toBe("function");
  });
});

// A zrender stand-in that keeps the listener the controller registers
const createZr = () => {
  const listeners: Record<string, (e: any) => void> = {};
  return {
    listeners,
    on: (type: string, listener: (e: any) => void) => {
      listeners[type] = listener;
    },
    off: (type: string) => {
      delete listeners[type];
    },
  };
};

// A controller enabled like the dataZoom and series roam do, whose plot area
// is the rectangle from 0,0 to 100,100
const createController = () => {
  const zr = createZr();
  const controller = new (RoamController as any)(zr);
  controller.enable(true, {
    zInfo: { component: { get: () => 0 } },
    triggerInfo: {
      roamTrigger: null,
      isInSelf: (_e: any, x: number, y: number) =>
        x >= 0 && x <= 100 && y >= 0 && y <= 100,
    },
    api: { getComponentByElement: () => undefined },
  });
  const zoom = vi.fn();
  controller.on("zoom", zoom);
  const pinch = (
    pinchScale: number,
    { x = 50, y = 50, type = "touchmove" } = {}
  ) => {
    const event = {
      type,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    zr.listeners.pinch({
      event,
      pinchScale,
      pinchX: x,
      pinchY: y,
    });
    return event;
  };
  return { zoom, pinch };
};

describe("roam-pinch-patch", () => {
  beforeAll(async () => {
    await import("../../../src/resources/echarts/roam-pinch-patch");
  });

  it("zooms by the real change in finger distance around the pinch center", () => {
    const { zoom, pinch } = createController();
    pinch(1.03, { x: 30, y: 40 });
    expect(zoom).toHaveBeenCalledOnce();
    expect(zoom.mock.calls[0][0]).toMatchObject({
      scale: 1.03,
      originX: 30,
      originY: 40,
    });
  });

  it("caps each step at 2x either way", () => {
    const { zoom, pinch } = createController();
    pinch(5);
    pinch(0.1);
    expect(zoom.mock.calls.map(([e]) => e.scale)).toEqual([2, 0.5]);
  });

  it("does not zoom when a finger is added or lifted", () => {
    const { zoom, pinch } = createController();
    const start = pinch(3, { type: "touchstart" });
    const end = pinch(3, { type: "touchend" });
    expect(zoom).not.toHaveBeenCalled();
    // Still cancelled, so the browser does not take over the gesture
    expect(start.preventDefault).toHaveBeenCalled();
    expect(end.preventDefault).toHaveBeenCalled();
  });

  it("cancels a pinch off the plot area without zooming or stopping it", () => {
    const { zoom, pinch } = createController();
    const event = pinch(1.5, { x: 50, y: 120 });
    expect(zoom).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it("cancels and stops a pinch that zooms", () => {
    const { pinch } = createController();
    const event = pinch(1.5);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
