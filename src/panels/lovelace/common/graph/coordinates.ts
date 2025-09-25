import { downSampleLineData } from "../../../../components/chart/down-sample";
import type { EntityHistoryState } from "../../../../data/history";

const calcPoints = (
  history: [number, number][],
  width: number,
  height: number,
  limits?: { minX?: number; maxX?: number; minY?: number; maxY?: number }
) => {
  let yAxisOrigin = height;
  let minY = limits?.minY ?? history[0][1];
  let maxY = limits?.maxY ?? history[0][1];
  const minX = limits?.minX ?? history[0][0];
  const maxX = limits?.maxX ?? history[history.length - 1][0];
  history.forEach(([_, stateValue]) => {
    if (stateValue < minY) {
      minY = stateValue;
    } else if (stateValue > maxY) {
      maxY = stateValue;
    }
  });
  const rangeY = maxY - minY || minY * 0.1;
  if (maxY < 0) {
    // all values are negative
    // add margin
    maxY += rangeY * 0.1;
    maxY = Math.min(0, maxY);
    yAxisOrigin = 0;
  } else if (minY < 0) {
    // some values are negative
    yAxisOrigin = (maxY / (maxY - minY || 1)) * height;
  } else {
    // all values are positive
    // add margin
    minY -= rangeY * 0.1;
    minY = Math.max(0, minY);
  }
  const yDenom = maxY - minY || 1;
  const xDenom = maxX - minX || 1;
  const points: [number, number][] = history.map((point) => {
    const x = ((point[0] - minX) / xDenom) * width;
    const y = height - ((point[1] - minY) / yDenom) * height;
    return [x, y];
  });
  points.push([width, points[points.length - 1][1]]);
  return { points, yAxisOrigin };
};

export const coordinates = (
  history: [number, number][],
  width: number,
  height: number,
  maxDetails: number,
  limits?: { minX?: number; maxX?: number; minY?: number; maxY?: number }
) => {
  history = history.filter((item) => !Number.isNaN(item[1]));

  const sampledData: [number, number][] = downSampleLineData(
    history,
    maxDetails,
    limits?.minX,
    limits?.maxX
  );
  return calcPoints(sampledData, width, height, limits);
};

export const coordinatesMinimalResponseCompressedState = (
  history: EntityHistoryState[] | undefined,
  width: number,
  height: number,
  maxDetails: number,
  limits?: { minX?: number; maxX?: number; minY?: number; maxY?: number }
) => {
  if (!history?.length) {
    return { points: [], yAxisOrigin: 0 };
  }
  const mappedHistory: [number, number][] = history.map((item) => [
    // With minimal response and compressed state, we don't have last_changed,
    // so we use last_updated since its always the same as last_changed since
    // we already filtered out states that are the same.
    item.lu * 1000,
    Number(item.s),
  ]);
  return coordinates(mappedHistory, width, height, maxDetails, limits);
};
