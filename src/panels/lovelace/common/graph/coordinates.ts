import { downSampleLineData } from "../../../../components/chart/down-sample";
import type { EntityHistoryState } from "../../../../data/history";

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
  return calcPoints(sampledData, width, height, limits);
};

// State history only holds changes, so a sensor that does not change sends
// nothing and two readings can be hours apart. A curve from one to the other
// shows a trend that never happened: the value held until the later reading.
// A stretch without readings counts as quiet when it is both this many times
// the average distance between the other readings and this much of the graph.
const QUIET_DISTANCE = 3;
const QUIET_WIDTH = 0.1;

// Finds the readings the sensor went quiet after, counting the stretch from
// the last reading to the end of the graph.
const findQuietStretches = (
  history: [number, number][],
  maxX: number,
  startsAtWindow: boolean
): number[] => {
  const width = maxX - history[0][0];

  if (history.length < 2 || width <= 0) {
    return [];
  }

  const quiet: number[] = [];

  for (let i = 0; i < history.length; i++) {
    const nextX = i + 1 < history.length ? history[i + 1][0] : maxX;
    const distance = nextX - history[i][0];
    // averaged over the other readings only, so that the stretch does not
    // raise the bar it has to clear, and a tenth of it when there are none
    const spacing =
      Math.max((width - distance) / (history.length - 1), 0) || distance / 10;

    if (
      distance > QUIET_DISTANCE * spacing &&
      // the first reading is the state at the start of the window, which moves
      // on with every redraw: holding it only while it covers a tenth of the
      // graph would snap the hold back into a curve as it scrolls out
      (distance > QUIET_WIDTH * width || (i === 0 && startsAtWindow))
    ) {
      quiet.push(i);
    }
  }

  return quiet;
};

// Holds the state across each quiet stretch. Sampling keeps the lowest and
// highest value of each frame, or their mean, so the reading before a stretch
// is put back first, and the one after it too unless the graph shows means,
// where one raw reading would stand out as a spike. The held line starts one
// average distance after the earlier reading and ends with points two and one
// before the later one, because each curve reaches halfway to its neighbours:
// that keeps the curves into and out of the stretch as tight as anywhere else.
const holdQuietStretches = (
  history: [number, number][],
  sampled: [number, number][],
  useMean: boolean,
  limits?: { minX?: number; maxX?: number }
): [number, number][] => {
  if (!history.length) {
    return sampled;
  }

  const maxX = limits?.maxX ?? history[history.length - 1][0];
  // the graphs move the state the window starts in to its start on every redraw
  const quiet = findQuietStretches(
    history,
    maxX,
    limits?.minX !== undefined && history[0][0] <= limits.minX
  );

  if (!quiet.length) {
    return sampled;
  }

  const ends = quiet.map((index) => history[index + 1]?.[0] ?? maxX);
  const quietWidth = quiet.reduce(
    (sum, index, i) => sum + ends[i] - history[index][0],
    0
  );
  const spacing =
    (maxX - history[0][0] - quietWidth) / Math.max(sampled.length - 1, 1);

  const result: [number, number][] = [];
  let next = 0;

  quiet.forEach((index, i) => {
    const settled = history[index];
    const resumed = history[index + 1] as [number, number] | undefined;
    const endX = ends[i];
    const step = Math.min(
      spacing || (endX - settled[0]) / 10,
      (endX - settled[0]) / 4
    );

    while (next < sampled.length && sampled[next][0] <= settled[0]) {
      result.push(sampled[next++]);
    }
    const last = result[result.length - 1];
    if (!last || last[0] !== settled[0] || last[1] !== settled[1]) {
      result.push(settled);
    }
    // nothing was recorded here, but the mean of a frame with readings on both
    // sides can land inside: it stands for the readings after the stretch, so
    // it moves to where they start
    const moved: [number, number][] = [];
    while (next < sampled.length && sampled[next][0] < endX) {
      moved.push([endX, sampled[next++][1]]);
    }

    result.push(
      [settled[0] + step, settled[1]],
      [endX - 2 * step, settled[1]],
      [endX - step, settled[1]],
      ...moved
    );

    const kept = sampled[next];
    if (
      resumed &&
      !useMean &&
      (!kept || kept[0] !== resumed[0] || kept[1] !== resumed[1])
    ) {
      result.push(resumed);
    }
  });

  while (next < sampled.length) {
    result.push(sampled[next++]);
  }

  return result;
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
  const mappedHistory: [number, number][] = history
    .map((item): [number, number] => [
      // With minimal response and compressed state, we don't have last_changed,
      // so we use last_updated since its always the same as last_changed since
      // we already filtered out states that are the same.
      item.lu * 1000,
      Number(item.s),
    ])
    .filter((item) => !Number.isNaN(item[1]));

  const sampledData: [number, number][] = downSampleLineData(
    mappedHistory,
    maxDetails,
    limits?.minX,
    limits?.maxX,
    useMean
  );
  return calcPoints(
    holdQuietStretches(mappedHistory, sampledData, useMean, limits),
    width,
    height,
    limits
  );
};
