import { strokeWidth } from "../../../../data/graph";
import type { EntityHistoryState } from "../../../../data/history";

const average = (items: any[]): number =>
  items.reduce((sum, entry) => sum + parseFloat(entry.state), 0) / items.length;

const lastValue = (items: any[]): number =>
  parseFloat(items[items.length - 1].state) || 0;

const calcPoints = (
  history: any,
  hours: number,
  width: number,
  detail: number,
  min: number,
  max: number
): [number, number][] => {
  const coords = [] as [number, number][];
  const height = 80;
  let yRatio = (max - min) / height;
  yRatio = yRatio !== 0 ? yRatio : height;
  let xRatio = width / (hours - (detail === 1 ? 1 : 0));
  xRatio = isFinite(xRatio) ? xRatio : width;

  let first = history.filter(Boolean)[0];
  if (detail > 1) {
    first = first.filter(Boolean)[0];
  }
  let last = [average(first), lastValue(first)];

  const getY = (value: number): number =>
    height + strokeWidth / 2 - (value - min) / yRatio;

  const getCoords = (item: any[], i: number, offset = 0, depth = 1) => {
    if (depth > 1 && item) {
      return item.forEach((subItem, index) =>
        getCoords(subItem, i, index, depth - 1)
      );
    }

    const x = xRatio * (i + offset / 6);

    if (item) {
      last = [average(item), lastValue(item)];
    }
    const y = getY(item ? last[0] : last[1]);
    return coords.push([x, y]);
  };

  for (let i = 0; i < history.length; i += 1) {
    getCoords(history[i], i, 0, detail);
  }

  coords.push([width, getY(last[1])]);
  return coords;
};

export const coordinates = (
  history: any,
  hours: number,
  width: number,
  detail: number,
  limits?: { min?: number; max?: number }
): [number, number][] | undefined => {
  history.forEach((item) => {
    item.state = Number(item.state);
  });
  history = history.filter((item) => !Number.isNaN(item.state));

  const min =
    limits?.min !== undefined
      ? limits.min
      : Math.min(...history.map((item) => item.state));
  const max =
    limits?.max !== undefined
      ? limits.max
      : Math.max(...history.map((item) => item.state));
  const now = new Date().getTime();

  const reduce = (res, item, point) => {
    const age = now - new Date(item.last_changed).getTime();

    let key = Math.abs(age / (1000 * 3600) - hours);
    if (point) {
      key = (key - Math.floor(key)) * 60;
      key = Number((Math.round(key / 10) * 10).toString()[0]);
    } else {
      key = Math.floor(key);
    }
    if (!res[key]) {
      res[key] = [];
    }
    res[key].push(item);
    return res;
  };

  history = history.reduce((res, item) => reduce(res, item, false), []);
  if (detail > 1) {
    history = history.map((entry) =>
      entry.reduce((res, item) => reduce(res, item, true), [])
    );
  }

  if (!history.length) {
    return undefined;
  }

  return calcPoints(history, hours, width, detail, min, max);
};

interface NumericEntityHistoryState {
  state: number;
  last_changed: number;
}

export const coordinatesMinimalResponseCompressedState = (
  history: EntityHistoryState[],
  hours: number,
  width: number,
  detail: number,
  limits?: { min?: number; max?: number }
): [number, number][] | undefined => {
  if (!history) {
    return undefined;
  }
  const numericHistory: NumericEntityHistoryState[] = history.map((item) => ({
    state: Number(item.s),
    // With minimal response and compressed state, we don't have last_changed,
    // so we use last_updated since its always the same as last_changed since
    // we already filtered out states that are the same.
    last_changed: item.lu * 1000,
  }));
  return coordinates(numericHistory, hours, width, detail, limits);
};
