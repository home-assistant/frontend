//Ground-projected shadow polygons (MapLibre 5 has no native cast-shadow for
//fill-extrusion). Per footprint, offset vertices by (h / tan(alt)) opposite the sun
//and emit the convex hull of (original, projected) as a flat Polygon; the 3D
//extrusion hides the under-feature part, leaving only the ground shadow visible.

import type maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

const M_PER_DEG_LAT = 111_320;

export interface ProjectShadowsOptions {
  //Compass azimuth, degrees clockwise from north (matches getSunPosition).
  sunAzimuthDeg: number;
  //Altitude above horizon in degrees.
  sunAltitudeDeg: number;
  //Reference latitude for the metres-to-degrees-of-longitude conversion.
  homeLat: number;
  //Drop features whose effective height is below this. Default 2 m.
  minHeightM?: number;
  //Sun-altitude cut-off below which we emit nothing (shadows grow to hundreds of
  //metres and the night-shade overlay already conveys darkness). Default 1.5 deg.
  minAltitudeDeg?: number;
  //Optional clip-to-disc against `clipRadiusMeters` around (clipCenterLat,
  //clipCenterLon), keeping shadows within the building visibility radius.
  clipCenterLat?: number;
  clipCenterLon?: number;
  clipRadiusMeters?: number;
}

export function projectExtrusionShadows(
  extrusions: GeoJSON.FeatureCollection,
  opts: ProjectShadowsOptions
): GeoJSON.FeatureCollection {
  const empty: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [],
  };

  const minAlt = opts.minAltitudeDeg ?? 1.5;
  if (opts.sunAltitudeDeg <= minAlt) {
    return empty;
  }

  const D = Math.PI / 180;
  const azR = opts.sunAzimuthDeg * D;
  const altR = opts.sunAltitudeDeg * D;

  //Shadow direction = opposite of the sun on the ground plane
  //(compass: x = east, y = north).
  const shadowDx = -Math.sin(azR);
  const shadowDy = -Math.cos(azR);

  const tanAlt = Math.tan(altR);
  const mPerDegLon = M_PER_DEG_LAT * Math.cos(opts.homeLat * D);
  const minH = opts.minHeightM ?? 2;

  //The clip disc (and its per-edge vectors) is independent of sun position, so build
  //it once per (center, radius) tuple, cached across calls.
  const clipBundle =
    typeof opts.clipCenterLat === "number" &&
    typeof opts.clipCenterLon === "number" &&
    typeof opts.clipRadiusMeters === "number" &&
    opts.clipRadiusMeters > 0
      ? getClipBundle(
          opts.clipCenterLat,
          opts.clipCenterLon,
          opts.clipRadiusMeters
        )
      : null;

  const out: GeoJSON.Feature[] = [];

  for (const feat of extrusions.features) {
    const geom = feat.geometry;
    if (!geom) {
      continue;
    }

    const props = (feat.properties ?? {}) as Record<string, unknown>;
    const top =
      typeof props["render_height"] === "number"
        ? (props["render_height"] as number)
        : 0;
    const base =
      typeof props["render_min_height"] === "number"
        ? (props["render_min_height"] as number)
        : 0;
    const h = Math.max(0, top - base);
    if (h < minH) {
      continue;
    }

    const lenM = h / tanAlt;
    const dLatDeg = (shadowDy * lenM) / M_PER_DEG_LAT;
    const dLonDeg = (shadowDx * lenM) / mPerDegLon;

    //Handle MultiPolygon for portability even though our pipelines emit single Polygons.
    let polygons: number[][][][] | null = null;
    if (geom.type === "Polygon") {
      polygons = [geom.coordinates as number[][][]];
    } else if (geom.type === "MultiPolygon") {
      polygons = geom.coordinates as number[][][][];
    }
    if (!polygons) {
      continue;
    }

    for (const poly of polygons) {
      if (!poly.length) {
        continue;
      }
      const outer = poly[0] as number[][];
      if (outer.length < 3) {
        continue;
      }

      //Convex hull of (original vertices + opposite-of-sun projections).
      const cloud: [number, number][] = [];
      for (const p of outer) {
        const lon = p[0];
        const lat = p[1];
        cloud.push([lon, lat]);
        cloud.push([lon + dLonDeg, lat + dLatDeg]);
      }
      const hull = convexHull(cloud);
      if (hull.length < 3) {
        continue;
      }

      //Optional clip-to-disc: a tall region near the edge casts a shadow trail well
      //past the visibility radius; clip it to the same disc as the rendered buildings.
      let ring: [number, number][] = hull;
      if (clipBundle) {
        const clipped = clipConvexPolygon(hull, clipBundle);
        if (clipped.length < 3) {
          continue;
        }
        ring = clipped;
      }
      ring = ring.slice();
      ring.push([ring[0][0], ring[0][1]]);

      out.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: { render_height: h },
      });
    }
  }

  return { type: "FeatureCollection", features: out };
}

//Cached 64-vertex clip disc plus its pre-baked per-edge vectors. Independent of sun
//position, so rebuilt only when the clip center or radius changes.
interface ClipBundle {
  ring: [number, number][];
  //Pre-baked edge vectors: d_[i] = ring[(i+1) % N] - ring[i].
  dx: Float64Array;
  dy: Float64Array;
}

let _clipBundleKey: string | null = null;
let _clipBundleCache: ClipBundle | null = null;

function getClipBundle(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): ClipBundle {
  const key = `${centerLat.toFixed(6)}|${centerLon.toFixed(6)}|${radiusMeters}`;
  if (key === _clipBundleKey && _clipBundleCache !== null) {
    return _clipBundleCache;
  }

  const segs = 64;
  const D = Math.PI / 180;
  const dLatDsc = radiusMeters / M_PER_DEG_LAT;
  const dLonDsc = radiusMeters / (M_PER_DEG_LAT * Math.cos(centerLat * D));
  const ring = new Array<[number, number]>(segs);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * 2 * Math.PI;
    ring[i] = [
      centerLon + Math.cos(a) * dLonDsc,
      centerLat + Math.sin(a) * dLatDsc,
    ];
  }
  const dx = new Float64Array(segs);
  const dy = new Float64Array(segs);
  for (let i = 0; i < segs; i++) {
    const n = (i + 1) % segs;
    dx[i] = ring[n][0] - ring[i][0];
    dy[i] = ring[n][1] - ring[i][1];
  }
  _clipBundleKey = key;
  _clipBundleCache = { ring, dx, dy };
  return _clipBundleCache;
}

//Sutherland-Hodgman clip of non-closed CCW `subject` against the CCW clip bundle.
//Returns the non-closed (possibly empty) intersection ring; inside = left-of-edge.
function clipConvexPolygon(
  subject: [number, number][],
  clip: ClipBundle
): [number, number][] {
  const ring = clip.ring;
  if (subject.length < 3 || ring.length < 3) {
    return [];
  }
  let output: [number, number][] = subject.slice();

  const dxArr = clip.dx;
  const dyArr = clip.dy;

  for (let e = 0; e < ring.length; e++) {
    if (output.length === 0) {
      return [];
    }
    const e1x = ring[e][0];
    const e1y = ring[e][1];
    const edx = dxArr[e];
    const edy = dyArr[e];

    const input = output;
    output = [];

    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const next = input[(i + 1) % input.length];
      //Cross of (edge_dir, point - e1); positive = inside for our CCW clip ring.
      const cCross = edx * (curr[1] - e1y) - edy * (curr[0] - e1x);
      const nCross = edx * (next[1] - e1y) - edy * (next[0] - e1x);
      const cIn = cCross >= 0;
      const nIn = nCross >= 0;
      if (cIn) {
        if (nIn) {
          output.push(next);
        } else {
          //Edge intersection at the zero-crossing: cCross / (cCross - nCross).
          const t = cCross / (cCross - nCross);
          output.push([
            curr[0] + t * (next[0] - curr[0]),
            curr[1] + t * (next[1] - curr[1]),
          ]);
        }
      } else if (nIn) {
        const t = cCross / (cCross - nCross);
        output.push([
          curr[0] + t * (next[0] - curr[0]),
          curr[1] + t * (next[1] - curr[1]),
        ]);
        output.push(next);
      }
    }
  }

  return output;
}

//Andrew's monotone chain. Returns vertices CCW, NOT closed.
export function convexHull(pts: [number, number][]): [number, number][] {
  if (pts.length < 3) {
    return pts.slice();
  }

  const arr = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number]
  ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of arr) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

//Cast-shadow raster painting: rasterise the projected polygons onto an offscreen
//canvas at solid black and push to the MapLibre ImageSource. Per-pixel coverage
//avoids the alpha-compositing saturation of many overlapping fill polygons.

//Offscreen raster resolution by precision level: 512/1024/2048 trade edge sharpness
//(~4/2/1 m/px at the worst-case 2 km bbox) against PNG encode cost (~2/10/40 ms).
export type ShadowPrecisionLevel = "low" | "medium" | "high";

const SHADOW_RASTER_SIZE_BY_PRECISION: Record<ShadowPrecisionLevel, number> = {
  low: 512,
  medium: 1024,
  high: 2048,
};

export function shadowRasterSizeFor(level: ShadowPrecisionLevel): number {
  return SHADOW_RASTER_SIZE_BY_PRECISION[level] ?? 1024;
}

//Transparent 1x1 PNG, the shadow source's initial image before the first paint pass.
export const BLANK_SHADOW_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=";

//Four lat/lon corners of the shadow image source in [NW, NE, SE, SW] order (the
//convention MapLibre image sources expect).
export type ShadowBoundsCorners = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

export function shadowBoundsCornersLL(
  homeLat: number,
  homeLon: number,
  radiusMeters: number
): ShadowBoundsCorners {
  const cosLat = Math.cos((homeLat * Math.PI) / 180);
  const dLat = radiusMeters / 111_320;
  const dLon = radiusMeters / (111_320 * cosLat);
  const minLon = homeLon - dLon;
  const maxLon = homeLon + dLon;
  const minLat = homeLat - dLat;
  const maxLat = homeLat + dLat;
  return [
    [minLon, maxLat], // NW
    [maxLon, maxLat], // NE
    [maxLon, minLat], // SE
    [minLon, minLat], // SW
  ];
}

//Rasterise the cast-shadow polygons onto the canvas and push the PNG to the image
//source. Solid black keeps overlaps black (no alpha stacking); the layer's
//`raster-opacity` then applies one per-pixel opacity. `fadeFullMeters` /
//`fadeOutMeters` add a radial alpha fall-off so the hard circular edge stops reading
//as a boundary.
export function paintShadowRaster(
  map: MapLibreMap,
  canvas: HTMLCanvasElement,
  features: GeoJSON.FeatureCollection,
  corners: ShadowBoundsCorners,
  radiusMeters: number,
  fadeFullMeters: number,
  fadeOutMeters: number
): void {
  const src = map.getSource("sol-building-shadows-src") as
    | maplibregl.ImageSource
    | undefined;
  if (!src) {
    return;
  }

  const minLon = corners[0][0];
  const maxLat = corners[0][1];
  const maxLon = corners[1][0];
  const minLat = corners[2][1];

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#000000";

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const lonToPx = (lon: number): number => ((lon - minLon) / lonSpan) * size;
  //Canvas Y is top-down, lat bottom-up: north edge maps to pixel 0.
  const latToPx = (lat: number): number => ((maxLat - lat) / latSpan) * size;

  for (const feat of features.features) {
    const geom = feat.geometry;
    if (!geom) {
      continue;
    }
    let polygons: number[][][][] | null = null;
    if (geom.type === "Polygon") {
      polygons = [geom.coordinates as number[][][]];
    } else if (geom.type === "MultiPolygon") {
      polygons = geom.coordinates as number[][][][];
    }
    if (!polygons) {
      continue;
    }

    for (const poly of polygons) {
      if (!poly.length) {
        continue;
      }
      const outer = poly[0] as number[][];
      if (outer.length < 3) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(lonToPx(outer[0][0]), latToPx(outer[0][1]));
      for (let i = 1; i < outer.length; i++) {
        ctx.lineTo(lonToPx(outer[i][0]), latToPx(outer[i][1]));
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  //Radial fade-out: a destination-in pass multiplies each pixel's alpha by a gradient
  //from 1 at the full-opacity radius to 0 at the outer fade radius. Canvas centre is
  //the home, since shadowBoundsCornersLL lays out the bounds symmetrically around it.
  if (fadeOutMeters > fadeFullMeters && radiusMeters > 0) {
    const cx = size / 2;
    const cy = size / 2;
    const halfPx = size / 2;
    const fullPx = Math.max(
      0,
      Math.min(halfPx, (fadeFullMeters / radiusMeters) * halfPx)
    );
    const fadePx = Math.max(
      fullPx,
      Math.min(halfPx, (fadeOutMeters / radiusMeters) * halfPx)
    );
    if (fadePx > fullPx) {
      const prevOp = ctx.globalCompositeOperation;
      const prevFill = ctx.fillStyle;
      const grad = ctx.createRadialGradient(cx, cy, fullPx, cx, cy, fadePx);
      grad.addColorStop(0, "rgba(0, 0, 0, 1)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = prevOp;
      ctx.fillStyle = prevFill;
    }
  }

  //Resync the bounds in case the home position or radius changed. Idempotent.
  try {
    src.setCoordinates(corners);
  } catch (_) {
    /* best-effort: bounds resync */
  }
  //ImageSource.updateImage only takes a URL, so serialise the canvas to a PNG data URL.
  try {
    const dataUrl = canvas.toDataURL("image/png");
    src.updateImage({ url: dataUrl });
  } catch (_) {
    /* best-effort: canvas PNG update */
  }
}
