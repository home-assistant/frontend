// State history only holds changes, so a sensor that does not change sends
// nothing and two points can be hours apart. Curving from one straight to the
// other shows a trend that never happened: the value held until the later point
// arrived. A stretch counts as such a gap when it is both this many times the
// average distance between the other points and this much of the drawn width.
const GAP_DISTANCE = 3;
export const GAP_WIDTH = 0.1;

// Finds the gaps among the coordinates, as the index of the point after each
// gap paired with the average distance between the other points.
export const findGaps = (coords: number[][]): [number, number][] => {
  const distances = coords.length - 1;
  const width = distances > 0 ? coords[distances][0] - coords[0][0] : 0;

  if (distances < 2 || width <= 0) {
    return [];
  }

  const gaps: [number, number][] = [];

  for (let i = 1; i < coords.length; i++) {
    const distance = coords[i][0] - coords[i - 1][0];
    // averaged over the other points only, so that the gap does not raise the
    // bar it has to clear, and a tenth of the gap when there are no others to
    // go by
    const spacing =
      Math.max((width - distance) / (distances - 1), 0) || distance / 10;

    if (distance > GAP_DISTANCE * spacing && distance > GAP_WIDTH * width) {
      gaps.push([i, spacing]);
    }
  }

  return gaps;
};

// Holds the earlier value across a gap. Each curve here reaches halfway along
// the segments either side of its point, so the held stretch starts one average
// distance after the earlier point and ends with points two and one before the
// later point, keeping the curves into and out of the gap as tight as anywhere
// else on the graph.
const holdValueAcrossGaps = (coords: number[][]): number[][] => {
  const gaps = findGaps(coords);

  if (!gaps.length) {
    return coords;
  }

  const held: number[][] = [];
  let from = 0;

  for (const [index, spacing] of gaps) {
    held.push(...coords.slice(from, index));
    const [fromX, heldY] = coords[index - 1];
    const toX = coords[index][0];
    held.push(
      [fromX + spacing, heldY],
      [toX - 2 * spacing, heldY],
      [toX - spacing, heldY]
    );
    from = index;
  }

  held.push(...coords.slice(from));
  return held;
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

export const getPath = (points: number[][], holdAcrossGaps = true): string => {
  if (!points.length) {
    return "";
  }

  const coords = holdAcrossGaps ? holdValueAcrossGaps(points) : points;

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
