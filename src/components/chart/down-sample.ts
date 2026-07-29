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
  const step = Math.ceil((max - min) / Math.floor(maxDetails));
  if (!Number.isFinite(step) || step <= 0) {
    // a degenerate frame size would put every point in a single frame
    return data;
  }

  if (useMean) {
    // Group points into frames, accumulating sums in insertion order.
    const frames = new Map<number, MeanFrame>();

    for (const point of data) {
      const pointData = getPointData(point);
      if (!Array.isArray(pointData)) continue;
      const x = Number(pointData[0]);
      const y = Number(pointData[1]);
      if (isNaN(x) || isNaN(y)) continue;

      const frameIndex = Math.floor((x - min) / step);
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

    const frameIndex = Math.floor((x - min) / step);
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
