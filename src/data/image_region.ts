/** A corner of an image region, in percent of the image from the top left. */
export interface ImageRegionPoint {
  x: number;
  y: number;
}

export const IMAGE_REGION_MIN_POINTS = 3;

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value));

/** Round to the 0.01 % the selector stores. */
export const roundPercent = (value: number): number =>
  Math.round(clampPercent(value) * 100) / 100;

export const roundPoint = (point: ImageRegionPoint): ImageRegionPoint => ({
  x: roundPercent(point.x),
  y: roundPercent(point.y),
});

const isPercent = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100;

/** Whether the value is a region the editor can show without changing it. */
export const isImageRegion = (value: unknown): value is ImageRegionPoint[] =>
  Array.isArray(value) &&
  value.every(
    (point) =>
      typeof point === "object" &&
      point !== null &&
      isPercent(point.x) &&
      isPercent(point.y)
  );

/** The index of the corner that starts the longest edge. */
const longestEdge = (points: ImageRegionPoint[]): number => {
  let longest = 0;
  let longestLength = -1;
  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length > longestLength) {
      longest = index;
      longestLength = length;
    }
  });
  return longest;
};

/** Insert a point in the middle of the edge that starts at `index`. */
export const insertMidpoint = (
  points: ImageRegionPoint[],
  index: number
): ImageRegionPoint[] => {
  const start = points[index];
  const end = points[(index + 1) % points.length];
  return [
    ...points.slice(0, index + 1),
    roundPoint({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }),
    ...points.slice(index + 1),
  ];
};

/**
 * The region spanned by two points: a rectangle, clockwise from the top left.
 * It becomes a triangle when at most 3 corners are allowed, and gets corners
 * on its edges when more than 4 are required.
 */
export const regionFromPoints = (
  start: ImageRegionPoint,
  end: ImageRegionPoint,
  minPoints: number,
  maxPoints: number
): ImageRegionPoint[] => {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  let points =
    maxPoints < 4
      ? [
          { x: (left + right) / 2, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ]
      : [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
  points = points.map(roundPoint);
  // Add the extra corners in the middle of the longest edge each time.
  while (points.length < minPoints) {
    points = insertMidpoint(points, longestEdge(points));
  }
  return points;
};

/** Move all points by the same offset, stopping at the image edges. */
export const movePoints = (
  points: ImageRegionPoint[],
  dx: number,
  dy: number
): ImageRegionPoint[] => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const offsetX = Math.min(
    100 - Math.max(...xs),
    Math.max(-Math.min(...xs), dx)
  );
  const offsetY = Math.min(
    100 - Math.max(...ys),
    Math.max(-Math.min(...ys), dy)
  );
  return points.map((point) =>
    roundPoint({ x: point.x + offsetX, y: point.y + offsetY })
  );
};
