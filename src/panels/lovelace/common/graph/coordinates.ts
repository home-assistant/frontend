import { strokeWidth } from "../../../../data/graph";

const average = (items: any[]): number => {
  return (
    items.reduce((sum, entry) => sum + parseFloat(entry.state), 0) /
    items.length
  );
};

const lastValue = (items: any[]): number => {
  return parseFloat(items[items.length - 1].state) || 0;
};

const calcPoints = (
  history: any,
  hours: number,
  width: number,
  detail: number,
  min: number,
  max: number
): number[][] => {
  const coords = [] as number[][];
  const height = 80;
  let yRatio = (max - min) / height;
  yRatio = yRatio !== 0 ? yRatio : height;
  let xRatio = width / (hours - (detail === 1 ? 1 : 0));
  xRatio = isFinite(xRatio) ? xRatio : width;

  const first = history.filter(Boolean)[0];
  let last = [average(first), lastValue(first)];

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
    const y =
      height + strokeWidth / 2 - ((item ? last[0] : last[1]) - min) / yRatio;
    return coords.push([x, y]);
  };

  for (let i = 0; i < history.length; i += 1) {
    getCoords(history[i], i, 0, detail);
  }

  if (coords.length === 1) {
    coords[1] = [width, coords[0][1]];
  }

  coords.push([width, coords[coords.length - 1][1]]);
  return coords;
};

export const coordinates = (
  history: any,
  hours: number,
  width: number,
  detail: number
): number[][] => {
  history.forEach((item) => (item.state = Number(item.state)));
  history = history.filter((item) => !Number.isNaN(item.state));

  const min = Math.min.apply(
    Math,
    history.map((item) => item.state)
  );
  const max = Math.max.apply(
    Math,
    history.map((item) => item.state)
  );
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
  return calcPoints(history, hours, width, detail, min, max);
};
