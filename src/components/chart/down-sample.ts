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
  const min = minX ?? data[0]![0];
  const max = maxX ?? data[data.length - 1]![0];
  const step = Math.floor((max - min) / width);
  const frames = new Map<
    number,
    { min: (typeof data)[number]; max: (typeof data)[number] }
  >();

  // Group points into frames
  for (const point of data) {
    if (!Array.isArray(point)) continue;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (isNaN(x) || isNaN(y)) continue;

    const frameIndex = Math.floor((x - min) / step);
    const frame = frames.get(frameIndex);
    if (!frame) {
      frames.set(frameIndex, { min: point, max: point });
    } else {
      if (frame.min![1] > y) {
        frame.min = point;
      }
      if (frame.max![1] < y) {
        frame.max = point;
      }
    }
  }

  // Convert frames back to points
  const result: typeof data = [];
  for (const [_i, frame] of frames) {
    // Use min/max points to preserve visual accuracy
    // The order of the data must be preserved so max may be before min
    if (frame.min![0] > frame.max![0]) {
      result.push(frame.max);
    }
    result.push(frame.min);
    if (frame.min![0] < frame.max![0]) {
      result.push(frame.max);
    }
  }

  return result;
}
