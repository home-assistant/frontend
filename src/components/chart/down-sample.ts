import type { LineSeriesOption } from "echarts";

type Point = NonNullable<LineSeriesOption["data"]>[number];

interface MeanFrame {
  sumX: number;
  sumY: number;
  count: number;
  isArray: boolean;
}

interface MinMaxFrame {
  minPoint: Point;
  minX: number;
  minY: number;
  maxPoint: Point;
  maxX: number;
  maxY: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Frame sizes that divide the clock evenly. Frames are placed on absolute time
// rather than relative to the window, so charts that follow "now" keep picking
// the same points every redraw instead of redrawing with a different shape.
const FRAME_SIZES = [
  [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500],
  [1, 2, 3, 5, 10, 15, 20, 30].map((n) => n * SECOND),
  [1, 2, 3, 5, 10, 15, 20, 30].map((n) => n * MINUTE),
  [1, 2, 3, 4, 6, 8, 12].map((n) => n * HOUR),
  [DAY],
].flat();

// Always rounds down, so no chart ends up with fewer frames than it asked for.
function snapFrameSize(step: number): number {
  if (step >= DAY) {
    return Math.floor(step / DAY) * DAY;
  }
  let snapped = FRAME_SIZES[0];
  for (const size of FRAME_SIZES) {
    if (size > step) {
      break;
    }
    snapped = size;
  }
  return snapped;
}

export function downSampleLineData<
  T extends [number, number] | NonNullable<LineSeriesOption["data"]>[number],
>(
  data: T[] | undefined,
  maxDetails: number,
  minX?: number,
  maxX?: number,
  useMean = false
): T[] {
  if (!data) {
    return [];
  }
  if (data.length <= maxDetails) {
    return data;
  }
  const min = minX ?? getPointData(data[0]!)[0];
  const max = maxX ?? getPointData(data[data.length - 1]!)[0];
  const rawStep = Math.ceil((max - min) / Math.floor(maxDetails));
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    // a degenerate frame size would put every point in a single frame
    return data;
  }
  // snapped after the guard above, which relies on the unsnapped value
  const step = snapFrameSize(rawStep);

  if (useMean) {
    // Group points into frames, accumulating sums in insertion order.
    const frames = new Map<number, MeanFrame>();

    for (const point of data) {
      const pointData = getPointData(point);
      if (!Array.isArray(pointData)) continue;
      const x = Number(pointData[0]);
      const y = Number(pointData[1]);
      if (isNaN(x) || isNaN(y)) continue;

      const frameIndex = Math.floor(x / step);
      const frame = frames.get(frameIndex);
      if (!frame) {
        frames.set(frameIndex, {
          sumX: x,
          sumY: y,
          count: 1,
          isArray: Array.isArray(pointData),
        });
      } else {
        frame.sumX += x;
        frame.sumY += y;
        frame.count += 1;
      }
    }

    const result: T[] = [];
    for (const frame of frames.values()) {
      const meanX = frame.sumX / frame.count;
      const meanY = frame.sumY / frame.count;
      const meanPoint = (
        frame.isArray ? [meanX, meanY] : { value: [meanX, meanY] }
      ) as T;
      result.push(meanPoint);
    }
    return result;
  }

  // Min/max mode: track the min and max point per frame in insertion order.
  const frames = new Map<number, MinMaxFrame>();

  for (const point of data) {
    const pointData = getPointData(point);
    if (!Array.isArray(pointData)) continue;
    const x = Number(pointData[0]);
    const y = Number(pointData[1]);
    if (isNaN(x) || isNaN(y)) continue;

    const frameIndex = Math.floor(x / step);
    const frame = frames.get(frameIndex);
    if (!frame) {
      frames.set(frameIndex, {
        minPoint: point,
        minX: x,
        minY: y,
        maxPoint: point,
        maxX: x,
        maxY: y,
      });
    } else {
      // Match the original strict-less / strict-greater comparisons so the
      // first occurrence wins on ties.
      if (y < frame.minY) {
        frame.minPoint = point;
        frame.minX = x;
        frame.minY = y;
      }
      if (y > frame.maxY) {
        frame.maxPoint = point;
        frame.maxX = x;
        frame.maxY = y;
      }
    }
  }

  const result: T[] = [];
  for (const frame of frames.values()) {
    // The order of the data must be preserved so max may be before min
    if (frame.minX > frame.maxX) {
      result.push(frame.maxPoint as T);
    }
    result.push(frame.minPoint as T);
    if (frame.minX < frame.maxX) {
      result.push(frame.maxPoint as T);
    }
  }

  return result;
}

function getPointData(point: NonNullable<LineSeriesOption["data"]>[number]) {
  const pointData =
    point && typeof point === "object" && "value" in point
      ? point.value
      : point;
  return pointData as number[];
}
