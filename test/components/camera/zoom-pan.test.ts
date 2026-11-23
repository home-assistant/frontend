import { describe, expect, it } from "vitest";
import {
  clampZoomPan,
  panBy,
  ZOOM_PAN_IDENTITY,
  zoomAtPoint,
} from "../../../src/components/camera/zoom-pan";

const size = { width: 400, height: 300 };

// A wrong transform shows black bars next to the picture, or zooms away from
// what the user pointed at
describe("zoomAtPoint", () => {
  it("keeps the point under the cursor in place", () => {
    const zoomed = zoomAtPoint(ZOOM_PAN_IDENTITY, 2, { x: 100, y: 75 }, size);
    expect(zoomed).toEqual({ scale: 2, x: -100, y: -75 });
    // The content point under the cursor stays at the same screen position
    expect((100 - zoomed.x) / zoomed.scale).toBe(100 / 1);
  });

  it("does not zoom out further than the whole picture", () => {
    const zoomed = zoomAtPoint(
      { scale: 2, x: -100, y: -75 },
      0.5,
      { x: 0, y: 0 },
      size
    );
    expect(zoomed).toEqual(ZOOM_PAN_IDENTITY);
  });

  it("stops at the maximum zoom", () => {
    expect(
      zoomAtPoint(ZOOM_PAN_IDENTITY, 50, { x: 0, y: 0 }, size, 4).scale
    ).toBe(4);
  });

  it("keeps the picture covering the viewport at the edges", () => {
    // Zooming at the bottom right corner can't move the picture past it
    expect(zoomAtPoint(ZOOM_PAN_IDENTITY, 2, { x: 400, y: 300 }, size)).toEqual(
      { scale: 2, x: -400, y: -300 }
    );
  });
});

describe("panBy", () => {
  it("pans within the zoomed in picture", () => {
    expect(panBy({ scale: 2, x: -100, y: -100 }, 50, -20, size)).toEqual({
      scale: 2,
      x: -50,
      y: -120,
    });
  });

  it("stops at the edges", () => {
    expect(panBy({ scale: 2, x: -100, y: -100 }, 500, -500, size)).toEqual({
      scale: 2,
      x: 0,
      y: -300,
    });
  });

  it("does not pan when not zoomed in", () => {
    expect(panBy(ZOOM_PAN_IDENTITY, 50, 50, size)).toEqual(ZOOM_PAN_IDENTITY);
  });
});

describe("clampZoomPan", () => {
  it("resets below the original size", () => {
    expect(clampZoomPan({ scale: 0.8, x: 10, y: 10 }, size)).toEqual(
      ZOOM_PAN_IDENTITY
    );
  });
});
