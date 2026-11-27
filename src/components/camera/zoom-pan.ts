/**
 * Zoom and pan of a picture in a viewport, applied as
 * `translate(x, y) scale(scale)` with the transform origin at the top left
 * of the viewport.
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

export interface ZoomPanRect extends ZoomPanSize {
  x: number;
  y: number;
}

/**
 * The viewport and where the picture shows in it before zooming, with bars
 * next to it when their aspect ratios differ.
 */
export interface ZoomPanViewport extends ZoomPanSize {
  picture: ZoomPanRect;
}

export const ZOOM_PAN_IDENTITY: ZoomPan = { scale: 1, x: 0, y: 0 };

export const MAX_ZOOM = 5;

export const isZoomed = (zoomPan: ZoomPan): boolean => zoomPan.scale > 1;

/**
 * The viewport with the picture fit in its middle, like `object-fit:
 * contain`. Without the size of the picture, it fills the viewport.
 */
export const fitPicture = (
  { width, height }: ZoomPanSize,
  pictureSize?: ZoomPanSize
): ZoomPanViewport => {
  if (!pictureSize?.width || !pictureSize.height || !width || !height) {
    return { width, height, picture: { x: 0, y: 0, width, height } };
  }
  const fit = Math.min(width / pictureSize.width, height / pictureSize.height);
  const pictureWidth = pictureSize.width * fit;
  const pictureHeight = pictureSize.height * fit;
  return {
    width,
    height,
    picture: {
      x: (width - pictureWidth) / 2,
      y: (height - pictureHeight) / 2,
      width: pictureWidth,
      height: pictureHeight,
    },
  };
};

/**
 * The offset on one axis that keeps the zoomed picture covering the viewport,
 * or in its middle while it is still smaller than the viewport.
 */
const clampOffset = (
  offset: number,
  scale: number,
  viewportLength: number,
  pictureStart: number,
  pictureLength: number
): number => {
  const scaledLength = pictureLength * scale;
  if (scaledLength <= viewportLength) {
    return (viewportLength - scaledLength) / 2 - pictureStart * scale;
  }
  const min = viewportLength - (pictureStart + pictureLength) * scale;
  // Not -0 when the picture starts at the edge of the viewport
  const max = 0 - pictureStart * scale;
  return Math.min(max, Math.max(min, offset));
};

/** Keeps the scale in range and the bars next to the picture out of view. */
export const clampZoomPan = (
  { scale, x, y }: ZoomPan,
  viewport: ZoomPanViewport,
  maxScale = MAX_ZOOM
): ZoomPan => {
  const clampedScale = Math.min(Math.max(scale, 1), maxScale);
  if (clampedScale === 1) {
    return ZOOM_PAN_IDENTITY;
  }
  const { picture } = viewport;
  return {
    scale: clampedScale,
    x: clampOffset(x, clampedScale, viewport.width, picture.x, picture.width),
    y: clampOffset(y, clampedScale, viewport.height, picture.y, picture.height),
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
  viewport: ZoomPanViewport,
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
    viewport,
    maxScale
  );
};

export const panBy = (
  zoomPan: ZoomPan,
  dx: number,
  dy: number,
  viewport: ZoomPanViewport,
  maxScale = MAX_ZOOM
): ZoomPan =>
  clampZoomPan(
    { ...zoomPan, x: zoomPan.x + dx, y: zoomPan.y + dy },
    viewport,
    maxScale
  );

/**
 * Keeps the part of the picture in the middle of the viewport there when the
 * viewport or the picture changes size, like when turning a phone.
 */
export const refitZoomPan = (
  zoomPan: ZoomPan,
  oldViewport: ZoomPanViewport,
  newViewport: ZoomPanViewport,
  maxScale = MAX_ZOOM
): ZoomPan => {
  const { scale } = zoomPan;
  const oldPicture = oldViewport.picture;
  const newPicture = newViewport.picture;
  if (!isZoomed(zoomPan) || !oldPicture.width || !oldPicture.height) {
    return clampZoomPan(zoomPan, newViewport, maxScale);
  }
  const centerX =
    ((oldViewport.width / 2 - zoomPan.x) / scale - oldPicture.x) /
    oldPicture.width;
  const centerY =
    ((oldViewport.height / 2 - zoomPan.y) / scale - oldPicture.y) /
    oldPicture.height;
  return clampZoomPan(
    {
      scale,
      x:
        newViewport.width / 2 -
        (newPicture.x + centerX * newPicture.width) * scale,
      y:
        newViewport.height / 2 -
        (newPicture.y + centerY * newPicture.height) * scale,
    },
    newViewport,
    maxScale
  );
};

/**
 * The part of the picture that shows, as fractions of the picture between 0
 * and 1.
 */
export const visiblePart = (
  { scale, x, y }: ZoomPan,
  { width, height, picture }: ZoomPanViewport
): ZoomPanRect => {
  if (!picture.width || !picture.height) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const left = Math.max(0, (-x / scale - picture.x) / picture.width);
  const right = Math.min(1, ((width - x) / scale - picture.x) / picture.width);
  const top = Math.max(0, (-y / scale - picture.y) / picture.height);
  const bottom = Math.min(
    1,
    ((height - y) / scale - picture.y) / picture.height
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
};
