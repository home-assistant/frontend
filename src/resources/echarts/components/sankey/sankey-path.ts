export interface SankeyPathShape {
  x: number;
  y: number;
  dx: number;
  dy: number;

  targets: {
    x: number;
    y: number;
    type: "curveHorizontal" | "curveVertical" | "line";
  }[];
}

export function buildPath(
  ctx: CanvasRenderingContext2D,
  shape: SankeyPathShape,
  curveness: number
) {
  if (shape.targets.length === 0) {
    return;
  }
  ctx.moveTo(shape.x, shape.y);
  const lastPoint = shape.targets[shape.targets.length - 1];
  const points = [
    { x: shape.x, y: shape.y, type: lastPoint.type },
    ...shape.targets,
  ];
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const prevPoint = points[i - 1];
    if (point.type === "curveHorizontal") {
      ctx.bezierCurveTo(
        prevPoint.x * (1 - curveness) + point.x * curveness,
        prevPoint.y,
        point.x * (1 - curveness) + prevPoint.x * curveness,
        point.y,
        point.x,
        point.y
      );
    } else if (point.type === "curveVertical") {
      ctx.bezierCurveTo(
        prevPoint.x,
        prevPoint.y * (1 - curveness) + point.y * curveness,
        point.x,
        point.y * (1 - curveness) + prevPoint.y * curveness,
        point.x,
        point.y
      );
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.lineTo(lastPoint.x + shape.dx, lastPoint.y + shape.dy);
  for (let i = points.length - 2; i >= 0; i--) {
    const prevPoint = {
      x: points[i + 1].x + shape.dx,
      y: points[i + 1].y + shape.dy,
      type: points[i + 1].type,
    };
    const point = {
      x: points[i].x + shape.dx,
      y: points[i].y + shape.dy,
      type: prevPoint.type,
    };
    if (point.type === "curveHorizontal") {
      ctx.bezierCurveTo(
        prevPoint.x * (1 - curveness) + point.x * curveness,
        prevPoint.y,
        point.x * (1 - curveness) + prevPoint.x * curveness,
        point.y,
        point.x,
        point.y
      );
    } else if (point.type === "curveVertical") {
      ctx.bezierCurveTo(
        prevPoint.x,
        prevPoint.y * (1 - curveness) + point.y * curveness,
        point.x,
        point.y * (1 - curveness) + prevPoint.y * curveness,
        point.x,
        point.y
      );
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.closePath();
}
