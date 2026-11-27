import { describe, expect, it } from "vitest";
import {
  clampZoomPan,
  fitPicture,
  panBy,
  refitZoomPan,
  visiblePart,
  ZOOM_PAN_IDENTITY,
  zoomAtPoint,
} from "../../../src/components/camera/zoom-pan";

const size = fitPicture({ width: 400, height: 300 });

// A 4:3 picture in a 16:9 viewport, with 120px bars left and right
const pillarboxed = fitPicture(
  { width: 640, height: 360 },
  { width: 1600, height: 1200 }
);

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

describe("fitPicture", () => {
  it("fits the picture in the middle of the viewport", () => {
    expect(pillarboxed.picture).toEqual({
      x: 80,
      y: 0,
      width: 480,
      height: 360,
    });
    expect(fitPicture({ width: 400, height: 300 }).picture).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  });
});

// Panning must not show the bars next to a picture of another aspect ratio
describe("bars next to the picture", () => {
  it("keeps the picture in the middle while it is narrower than the viewport", () => {
    // 480 * 1.2 = 576 is still narrower than 640
    expect(
      zoomAtPoint(ZOOM_PAN_IDENTITY, 1.2, { x: 0, y: 0 }, pillarboxed)
    ).toEqual({ scale: 1.2, x: (640 - 576) / 2 - 80 * 1.2, y: 0 });
  });

  it("stops at the edges of the picture, not of the viewport", () => {
    // The picture spans 160 to 1120 at 2x, so it can move 320px each way
    expect(panBy({ scale: 2, x: -480, y: 0 }, 1000, 0, pillarboxed).x).toBe(
      -160
    );
    expect(panBy({ scale: 2, x: -480, y: 0 }, -1000, 0, pillarboxed).x).toBe(
      640 - 1120
    );
  });
});

describe("visiblePart", () => {
  it("is the part of the picture in view", () => {
    // At 2x, the left half of the visible area is the picture's left edge
    expect(visiblePart({ scale: 2, x: -160, y: 0 }, pillarboxed)).toEqual({
      x: 0,
      y: 0,
      width: 640 / 2 / 480,
      height: 0.5,
    });
  });
});

describe("refitZoomPan", () => {
  it("keeps the middle of the view when the viewport changes", () => {
    const zoomed = { scale: 2, x: -400, y: -300 };
    const larger = fitPicture({ width: 800, height: 600 });
    expect(refitZoomPan(zoomed, size, larger)).toEqual({
      scale: 2,
      x: -800,
      y: -600,
    });
  });
});
