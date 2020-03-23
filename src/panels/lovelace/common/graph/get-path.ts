const midPoint = (
  _Ax: number,
  _Ay: number,
  _Bx: number,
  _By: number
): number[] => {
  const _Zx = (_Ax - _Bx) / 2 + _Bx;
  const _Zy = (_Ay - _By) / 2 + _By;
  return [_Zx, _Zy];
};

export const getPath = (coords: number[][]): string => {
  if (!coords.length) {
    return "";
  }

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
