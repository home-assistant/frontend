import { downSampleLineData } from "../../../../components/chart/down-sample";
import type { EntityHistoryState } from "../../../../data/history";
import { findGaps, GAP_WIDTH } from "./get-path";

export interface GraphSize {
  width: number;
  height: number;
}

export const scaleCoordinates = (
  coordinates: number[][],
  from: GraphSize,
  to: GraphSize
): number[][] => {
  if (from.width === to.width && from.height === to.height) {
    return coordinates;
  }
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  return coordinates.map(([x, y]) => [x * scaleX, y * scaleY]);
};

const calcPoints = (
  history: [number, number][],
  width: number,
  height: number,
  limits?: { minX?: number; maxX?: number; minY?: number; maxY?: number }
) => {
  // handling empty history (for example unavailable for long time)
  if (history.length === 0) {
    return { points: [], yAxisOrigin: height };
  }

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
  // add top and bottom margins to prevent cropping
  maxY += rangeY * 0.1;
  minY -= rangeY * 0.1;
  if (maxY < 0) {
    // all values are negative
    maxY = Math.min(0, maxY);
    yAxisOrigin = 0;
  } else if (minY < 0) {
    // some values are negative
    yAxisOrigin = (maxY / (maxY - minY || 1)) * height;
  } else {
    // all values are positive
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

// Checks each gap getPath will find against the raw history. Where the sensor
// really went quiet, puts back the raw point before the widest raw step: the
// state it settled on. Where readings carry on, the gap only comes from two
// frames keeping points at their far ends, so puts back the reading nearest
// its middle to break it up.
const checkGapsAgainstHistory = (
  history: [number, number][],
  points: [number, number][],
  maxX: number
): [number, number][] => {
  // calcPoints closes the graph at maxX with the last value, so getPath sees
  // that stretch too
  const closed = [...points, [maxX, points[points.length - 1][1]]];
  const gaps = findGaps(closed);

  if (!gaps.length) {
    return points;
  }

  const minQuiet = GAP_WIDTH * (maxX - closed[0][0]);
  const result: [number, number][] = [];
  let from = 0;

  for (const [index] of gaps) {
    result.push(...points.slice(from, index));
    from = index;

    const before = closed[index - 1];
    const afterX = closed[index][0];
    const middleX = (before[0] + afterX) / 2;
    let previous = before;
    let settled = before;
    let widest = 0;
    let middle: [number, number] | undefined;

    for (const point of history) {
      if (point[0] > before[0] && point[0] < afterX) {
        if (point[0] - previous[0] > widest) {
          widest = point[0] - previous[0];
          settled = previous;
        }
        if (
          !middle ||
          Math.abs(point[0] - middleX) < Math.abs(middle[0] - middleX)
        ) {
          middle = point;
        }
        previous = point;
      }
    }
    if (afterX - previous[0] > widest) {
      widest = afterX - previous[0];
      settled = previous;
    }

    if (middle && widest <= minQuiet) {
      result.push(middle);
    } else if (settled[0] !== before[0] || settled[1] !== before[1]) {
      result.push(settled as [number, number]);
    }
  }

  result.push(...points.slice(from));
  return result.length === points.length ? points : result;
};

// Sampling keeps the lowest and highest value of each frame, or their mean, so
// it can drop the state a sensor settled on before it went quiet, and can make
// a stretch with readings all through it look like a gap. getPath holds the
// point before a gap across the whole gap, so only a stretch the sensor was
// really quiet for may be a gap, and the point before it has to be the last
// real state.
const keepLastStateBeforeGaps = (
  history: [number, number][],
  sampled: [number, number][],
  maxX = sampled[sampled.length - 1]?.[0]
): [number, number][] => {
  if (sampled === history || !sampled.length) {
    return sampled;
  }

  // a point put back changes the distances getPath compares, which can turn
  // another stretch into a gap, so repeat until nothing changes
  let points = sampled;
  let next = checkGapsAgainstHistory(history, points, maxX);
  while (next !== points) {
    points = next;
    next = checkGapsAgainstHistory(history, points, maxX);
  }

  return points;
};

export const coordinates = (
  history: [number, number][],
  width: number,
  height: number,
  maxDetails: number,
  limits?: { minX?: number; maxX?: number; minY?: number; maxY?: number },
  useMean = false
) => {
  history = history.filter((item) => !Number.isNaN(item[1]));

  const sampledData: [number, number][] = downSampleLineData(
    history,
    maxDetails,
    limits?.minX,
    limits?.maxX,
    useMean
  );
  return calcPoints(
    keepLastStateBeforeGaps(history, sampledData, limits?.maxX),
    width,
    height,
    limits
  );
};

export const coordinatesMinimalResponseCompressedState = (
  history: EntityHistoryState[] | undefined,
  width: number,
  height: number,
  maxDetails: number,
  limits?: { minX?: number; maxX?: number; minY?: number; maxY?: number },
  useMean = false
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
  return coordinates(mappedHistory, width, height, maxDetails, limits, useMean);
};
