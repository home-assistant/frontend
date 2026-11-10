// State history only holds changes, so a sensor that does not change sends
// nothing and two points can be hours apart. Curving from one straight to the
// other shows a trend that never happened: the value held until the later point
// arrived. A stretch counts as such a gap when it is both this many times the
// average distance between the other points and this much of the drawn width.
const GAP_DISTANCE = 2;
const GAP_WIDTH = 0.1;

// Holds the earlier value across a gap, up to one average distance before the
// later point, where the curve then picks it up as it would any other point.
const holdValueAcrossGaps = (coords: number[][]): number[][] => {
  const distances = coords.length - 1;
  const width = coords[distances][0] - coords[0][0];

  if (distances < 2 || width <= 0) {
    return coords;
  }

  let held: number[][] | undefined;

  for (let i = 1; i < coords.length; i++) {
    const distance = coords[i][0] - coords[i - 1][0];
    // averaged over the other points only, so that the gap does not raise the
    // bar it has to clear, and a tenth of the gap when there are no others to
    // go by
    const spacing =
      Math.max((width - distance) / (distances - 1), 0) || distance / 10;

    if (distance > GAP_DISTANCE * spacing && distance > GAP_WIDTH * width) {
      held ??= coords.slice(0, i);
      held.push([coords[i][0] - spacing, coords[i - 1][1]]);
    }

    held?.push(coords[i]);
  }

  return held ?? coords;
};

const midPoint = (
  _Ax: number,
  _Ay: number,
  _Bx: number,
  _By: number
): number[] => {
  const zX = (_Ax - _Bx) / 2 + _Bx;
  const zY = (_Ay - _By) / 2 + _By;
  return [zX, zY];
};

export const getPath = (points: number[][]): string => {
  if (!points.length) {
    return "";
  }

  const coords = holdValueAcrossGaps(points);

  let next: number[];
  let Z: number[];
  const X = 0;
  const Y = 1;
  let path = "";
  let last = coords.filter(Boolean)[0];

  path += `M ${last[X]},${last[Y]}`;

  for (const coord of coords) {
    next = coord;
    Z = midPoint(last[X], last[Y], next[X], next[Y]);
    path += ` ${Z[X]},${Z[Y]}`;
    path += ` Q${next[X]},${next[Y]}`;
    last = next;
  }

  path += ` ${next![X]},${next![Y]}`;
  return path;
};
