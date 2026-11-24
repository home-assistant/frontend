/**
 * Zoom and pan of content that fills a viewport, applied as
 * `translate(x, y) scale(scale)` with the transform origin at the top left.
 */
export interface ZoomPan {
  scale: number;
  x: number;
  y: number;
}

export interface ZoomPanSize {
  width: number;
  height: number;
}

export const ZOOM_PAN_IDENTITY: ZoomPan = { scale: 1, x: 0, y: 0 };

export const MAX_ZOOM = 5;

export const isZoomed = (zoomPan: ZoomPan): boolean => zoomPan.scale > 1;

/** Keeps the scale in range and the content covering the whole viewport. */
export const clampZoomPan = (
  { scale, x, y }: ZoomPan,
  { width, height }: ZoomPanSize,
  maxScale = MAX_ZOOM
): ZoomPan => {
  const clampedScale = Math.min(Math.max(scale, 1), maxScale);
  if (clampedScale === 1) {
    return ZOOM_PAN_IDENTITY;
  }
  const minX = width - width * clampedScale;
  const minY = height - height * clampedScale;
  return {
    scale: clampedScale,
    x: Math.min(0, Math.max(minX, x)),
    y: Math.min(0, Math.max(minY, y)),
  };
};

/**
 * Zooms to a new scale while the point under the cursor or between the
 * fingers stays where it is. The point is relative to the viewport.
 */
export const zoomAtPoint = (
  zoomPan: ZoomPan,
  scale: number,
  point: { x: number; y: number },
  size: ZoomPanSize,
  maxScale = MAX_ZOOM
): ZoomPan => {
  const clampedScale = Math.min(Math.max(scale, 1), maxScale);
  const ratio = clampedScale / zoomPan.scale;
  return clampZoomPan(
    {
      scale: clampedScale,
      x: point.x - (point.x - zoomPan.x) * ratio,
      y: point.y - (point.y - zoomPan.y) * ratio,
    },
    size,
    maxScale
  );
};

export const panBy = (
  zoomPan: ZoomPan,
  dx: number,
  dy: number,
  size: ZoomPanSize,
  maxScale = MAX_ZOOM
): ZoomPan =>
  clampZoomPan(
    { ...zoomPan, x: zoomPan.x + dx, y: zoomPan.y + dy },
    size,
    maxScale
  );
