type Vector = [number, number];
type Matrix = [Vector, Vector];

const rotateVector = ([[a, b], [c, d]]: Matrix, [x, y]: Vector): Vector => [
  a * x + b * y,
  c * x + d * y,
];
const createRotateMatrix = (x: number): Matrix => [
  [Math.cos(x), -Math.sin(x)],
  [Math.sin(x), Math.cos(x)],
];
const addVector = ([a1, a2]: Vector, [b1, b2]: Vector): Vector => [
  a1 + b1,
  a2 + b2,
];

export const toRadian = (angle: number) => (angle / 180) * Math.PI;

type ArcOptions = {
  x: number;
  y: number;
  r: number;
  start: number;
  end: number;
  rotate?: number;
};

export const svgArc = (options: ArcOptions) => {
  const { x, y, r, start, end, rotate = 0 } = options;
  const cx = x;
  const cy = y;
  const rx = r;
  const ry = r;
  const t1 = toRadian(start);
  const t2 = toRadian(end);
  const delta = (t2 - t1) % (2 * Math.PI);
  const phi = toRadian(rotate);

  const rotMatrix = createRotateMatrix(phi);
  const [sX, sY] = addVector(
    rotateVector(rotMatrix, [rx * Math.cos(t1), ry * Math.sin(t1)]),
    [cx, cy]
  );
  const [eX, eY] = addVector(
    rotateVector(rotMatrix, [
      rx * Math.cos(t1 + delta),
      ry * Math.sin(t1 + delta),
    ]),
    [cx, cy]
  );
  const fA = delta > Math.PI ? 1 : 0;
  const fS = delta > 0 ? 1 : 0;

  return [
    "M",
    sX,
    sY,
    "A",
    rx,
    ry,
    (phi / (2 * Math.PI)) * 360,
    fA,
    fS,
    eX,
    eY,
  ].join(" ");
};
