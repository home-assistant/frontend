import type { LineSeriesOption } from "echarts";

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

  // Group points into frames
  const frames = new Map<
    number,
    { point: (typeof data)[number]; x: number; y: number }[]
  >();

  for (const point of data) {
    const pointData = getPointData(point);
    if (!Array.isArray(pointData)) continue;
    const x = Number(pointData[0]);
    const y = Number(pointData[1]);
    if (isNaN(x) || isNaN(y)) continue;

    const frameIndex = Math.floor((x - min) / step);
    const frame = frames.get(frameIndex);
    if (!frame) {
      frames.set(frameIndex, [{ point, x, y }]);
    } else {
      frame.push({ point, x, y });
    }
  }

  // Convert frames back to points
  const result: T[] = [];

  if (useMean) {
    // Use mean values for each frame
    for (const [_i, framePoints] of frames) {
      const sumY = framePoints.reduce((acc, p) => acc + p.y, 0);
      const meanY = sumY / framePoints.length;
      const sumX = framePoints.reduce((acc, p) => acc + p.x, 0);
      const meanX = sumX / framePoints.length;

      const firstPoint = framePoints[0].point;
      const pointData = getPointData(firstPoint);
      const meanPoint = (
        Array.isArray(pointData) ? [meanX, meanY] : { value: [meanX, meanY] }
      ) as T;
      result.push(meanPoint);
    }
  } else {
    // Use min/max values for each frame
    for (const [_i, framePoints] of frames) {
      let minPoint = framePoints[0];
      let maxPoint = framePoints[0];

      for (const p of framePoints) {
        if (p.y < minPoint.y) {
          minPoint = p;
        }
        if (p.y > maxPoint.y) {
          maxPoint = p;
        }
      }

      // The order of the data must be preserved so max may be before min
      if (minPoint.x > maxPoint.x) {
        result.push(maxPoint.point);
      }
      result.push(minPoint.point);
      if (minPoint.x < maxPoint.x) {
        result.push(maxPoint.point);
      }
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
