import type { LineSeriesOption } from "echarts";

export function downSampleLineData(
  data: LineSeriesOption["data"],
  chartWidth: number,
  minX?: number,
  maxX?: number
) {
  if (!data || data.length < 10) {
    return data;
  }
  const width = chartWidth * window.devicePixelRatio;
  if (data.length <= width) {
    return data;
  }
  const min = minX ?? getPointData(data[0]!)[0];
  const max = maxX ?? getPointData(data[data.length - 1]!)[0];
  const step = Math.floor((max - min) / width);
  const frames = new Map<
    number,
    {
      min: { point: (typeof data)[number]; x: number; y: number };
      max: { point: (typeof data)[number]; x: number; y: number };
    }
  >();

  // Group points into frames
  for (const point of data) {
    const pointData = getPointData(point);
    if (!Array.isArray(pointData)) continue;
    const x = Number(pointData[0]);
    const y = Number(pointData[1]);
    if (isNaN(x) || isNaN(y)) continue;

    const frameIndex = Math.floor((x - min) / step);
    const frame = frames.get(frameIndex);
    if (!frame) {
      frames.set(frameIndex, { min: { point, x, y }, max: { point, x, y } });
    } else {
      if (frame.min.y > y) {
        frame.min = { point, x, y };
      }
      if (frame.max.y < y) {
        frame.max = { point, x, y };
      }
    }
  }

  // Convert frames back to points
  const result: typeof data = [];
  for (const [_i, frame] of frames) {
    // Use min/max points to preserve visual accuracy
    // The order of the data must be preserved so max may be before min
    if (frame.min.x > frame.max.x) {
      result.push(frame.max.point);
    }
    result.push(frame.min.point);
    if (frame.min.x < frame.max.x) {
      result.push(frame.max.point);
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
