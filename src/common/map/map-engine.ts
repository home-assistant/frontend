/**
 * Map engine abstraction for ha-map: MapLibre GL where WebGL2 is available,
 * Leaflet as the viewing fallback. The Leaflet engine is frozen at this
 * contract; new capabilities go on MapLibre only, as optional members like
 * `editing`.
 *
 * Positions are [latitude, longitude]; zoom levels use Leaflet semantics.
 */

import type { ResolvedMapStyle } from "./map-styles";

export type MapLatLng = [latitude: number, longitude: number];

export interface MapView {
  center: MapLatLng;
  zoom: number;
}

export type MapControlPosition =
  "topleft" | "topright" | "bottomleft" | "bottomright";

export interface MapEngineEvents {
  /** Click on the map surface, not on a marker */
  click(location: MapLatLng): void;
  /** Zoom is starting, programmatic or not */
  zoomStart(): void;
  /** The map starts moving, programmatic or not */
  moveStart(): void;
  /** The engine can no longer render; the host switches to the fallback */
  fatal(): void;
  /**
   * The map has something to show: MapLibre's first complete view, or Leaflet's
   * layer in place. The host keeps the container hidden until then.
   */
  drawn(): void;
}

export interface MapEngineOptions {
  center: MapLatLng;
  zoom: number;
  /** Cartography to draw; the host resolves the config and theme mode into one */
  mapStyle: ResolvedMapStyle;
  /** Token for core's tile proxy */
  token?: string;
  zoomControlPosition: MapControlPosition;
  /** Render without WebGL after a permanent context loss; WebGL engines reject init */
  rasterOnly?: boolean;
  events: Partial<MapEngineEvents>;
}

export interface MapFitOptions {
  /** Do not zoom in beyond this level even if the bounds would allow it */
  maxZoom?: number;
  /** Relative padding around the bounds, e.g. 0.5 grows them by 50% */
  pad?: number;
  /** Ease the camera to the bounds instead of jumping; defaults to true */
  animate?: boolean;
  /** Fly in an arc instead of easing straight there; defaults to false */
  fly?: boolean;
  /** Viewport pixels covered by overlays; the bounds fit inside the rest */
  padding?: MapFitPadding;
}

export interface MapFitPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface MapMarkerOptions {
  /** Rendered size of the element in pixels */
  size: [width: number, height: number];
  /** Point of the element placed on the coordinate, from its top left; defaults to the center */
  anchor?: [x: number, y: number];
  /** Drawn above the other markers */
  raised?: boolean;
  /** Takes pointer input; defaults to true */
  interactive?: boolean;
  /** A keyboard-focusable button, for markers that act on activation; defaults to interactive */
  focusable?: boolean;
  /** Accessible name */
  title?: string;
  /** Also show the title as the browser's tooltip; defaults to true */
  nativeTitle?: boolean;
  /** A meter-radius circle sharing the marker's lifecycle (GPS accuracy) */
  decoration?: MapCircleOptions;
  /** Cluster this marker; it appears once setClustering is called */
  cluster?: boolean;
  /** Caller data handed back to the cluster icon builder */
  clusterData?: unknown;
}

export interface MapCircleOptions {
  /** Radius in meters */
  radius: number;
  /** Stroke color; the fill is derived from it, translucent */
  color: string;
  /** Stroke the circle; defaults to true */
  outline?: boolean;
}

export interface MapPathSegment {
  points: MapLatLng[];
  opacity?: number;
}

export interface MapPathMarker {
  location: MapLatLng;
  opacity?: number;
  /** Tooltip/popup HTML shown on hover; caller is responsible for escaping */
  tooltipHtml: string;
}

export interface MapPath {
  color: string;
  segments: MapPathSegment[];
  markers: MapPathMarker[];
}

/** Handle to anything placed on the map; remove() must be idempotent */
export interface MapItemHandle {
  remove(): void;
}

export interface MapMarkerHandle extends MapItemHandle {
  readonly location: MapLatLng;
  readonly clusterData?: unknown;
}

export interface MapCircleHandle extends MapItemHandle {
  /** Move, resize or recolor without removing it first */
  update(center: MapLatLng, options: MapCircleOptions): void;
}

export interface MapPathHandle extends MapItemHandle {
  /** Replace the drawn trail without removing it first */
  update(path: MapPath): void;
}

export interface MapDraggableMarkerOptions extends MapMarkerOptions {
  onDragEnd?(location: MapLatLng): void;
}

export interface MapEditableCircleOptions {
  /** Radius in meters */
  radius: number;
  /** Stroke color; the fill is derived from it, translucent */
  color: string;
  /** Element shown at the center, e.g. the zone icon; a plain dot otherwise */
  centerElement?: HTMLElement;
  centerSize?: [width: number, height: number];
  title?: string;
  nativeTitle?: boolean;
  /** The center can be dragged */
  moveable?: boolean;
  /** A handle on the edge can be dragged to change the radius */
  resizable?: boolean;
  /** Accessible name of the radius handle, e.g. "Radius of Home in meters" */
  resizeLabel?: string;
  onMove?(center: MapLatLng): void;
  onResize?(radius: number): void;
  onClick?(): void;
}

export interface MapEditingSupport {
  /** Place a draggable HTML element marker */
  addDraggableMarker(
    element: HTMLElement,
    location: MapLatLng,
    options: MapDraggableMarkerOptions
  ): MapEditableMarkerHandle;

  /** Draw a circle whose center and radius can be dragged */
  addEditableCircle(
    center: MapLatLng,
    options: MapEditableCircleOptions
  ): MapEditableCircleHandle;
}

/** A circle with drag handles for its center and radius */
export interface MapEditableCircleHandle extends MapItemHandle {
  readonly center: MapLatLng;
  readonly radius: number;
  /** Move and resize without recreating (no-op mid-drag) */
  update(center: MapLatLng, radius: number): void;
}

export interface MapEditableMarkerHandle extends MapMarkerHandle {
  /** Move without recreating (no-op mid-drag) */
  setLocation(location: MapLatLng): void;
}

export interface MapClusterIcon {
  element: HTMLElement;
  size: [width: number, height: number];
  /** Like MapMarkerOptions.anchor; defaults to the element's center */
  anchor?: [x: number, y: number];
  /** Show the icon here instead of at the cluster, e.g. attached to a zone */
  location?: MapLatLng;
}

export interface MapClusterOptions {
  /** Cluster markers closer than this many screen pixels */
  radius: number;
  /**
   * Markers sharing a key (e.g. their zone) form one group while they span
   * at most groupRadius pixels; beyond that, and without a key, they cluster
   * by proximity.
   */
  groupKey?(marker: MapMarkerHandle): string | undefined;
  groupRadius?: number;
  /**
   * Builds a cluster's element; called when its members change and on
   * refreshClusters(). An expanded cluster shows every member.
   */
  iconBuilder(
    members: MapMarkerHandle[],
    location: MapLatLng,
    key?: string,
    expanded?: boolean
  ): MapClusterIcon;
}

export interface MapEngine {
  /** Create the map in the container; call once */
  init(container: HTMLElement, options: MapEngineOptions): Promise<void>;

  /** Tear down the map and release its resources (DOM, workers, WebGL) */
  destroy(): void;

  /** Re-measure the container after a size change */
  invalidateSize(): void;

  /** Whether the map has a non-zero size, re-measuring if needed */
  hasUsableSize(): boolean;

  setMapStyle(style: ResolvedMapStyle): void;

  setZoomControlPosition(position: MapControlPosition): void;

  /** Show a scale ruler (bottom start); null hides it */
  setScaleRuler(options: { metric: boolean } | null): void;

  setView(center: MapLatLng, zoom?: number): void;

  getView(): MapView | undefined;

  setZoom(zoom: number): void;

  /** Fit the given points into view; a single point centers on it */
  fitBounds(points: MapLatLng[], options?: MapFitOptions): void;

  /** Pan to the location, keeping the zoom */
  panTo(location: MapLatLng): void;

  /** Whether the location is inside the current viewport */
  containsLocation(location: MapLatLng): boolean;

  /** Place a caller-owned element on the map */
  addMarker(
    element: HTMLElement,
    location: MapLatLng,
    options: MapMarkerOptions
  ): MapMarkerHandle;

  /** Draw a meter-radius circle (zone radius) */
  addCircle(center: MapLatLng, options: MapCircleOptions): MapCircleHandle;

  /** Editing support, MapLibre only; undefined on the Leaflet fallback */
  editing?: MapEditingSupport;

  /** Draw one history trail (points with tooltips, connecting segments) */
  addPath(path: MapPath): MapPathHandle;

  /** Cluster the markers added with cluster: true; call after each batch of addMarker calls */
  setClustering(options: MapClusterOptions | null): void;

  /** Rebuild cluster icons without regrouping (e.g. after a style change) */
  refreshClusters(): void;
}

const EARTH_RADIUS = 6371008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * The point a distance away from center along a bearing (degrees clockwise
 * from north), on the great circle. Longitude is left unwrapped so a ring of
 * points stays continuous across the antimeridian.
 */
export const destinationPoint = (
  center: MapLatLng,
  distanceInMeters: number,
  bearingDegrees: number
): MapLatLng => {
  const angular = distanceInMeters / EARTH_RADIUS;
  const lat = toRadians(center[0]);
  const bearing = toRadians(bearingDegrees);
  const destLat = Math.asin(
    Math.sin(lat) * Math.cos(angular) +
      Math.cos(lat) * Math.sin(angular) * Math.cos(bearing)
  );
  const dLng = Math.atan2(
    Math.sin(bearing) * Math.sin(angular) * Math.cos(lat),
    Math.cos(angular) - Math.sin(lat) * Math.sin(destLat)
  );
  return [toDegrees(destLat), center[1] + toDegrees(dLng)];
};

/** Great-circle distance in meters */
export const distanceMeters = (a: MapLatLng, b: MapLatLng): number => {
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[0])) *
      Math.cos(toRadians(b[0])) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
};

/** The point the given distance due east of center, e.g. for a resize handle */
export const pointEastOf = (
  center: MapLatLng,
  distanceInMeters: number
): MapLatLng => destinationPoint(center, distanceInMeters, 90);

/**
 * Bounding box corners of a circle, for fitting a radius into view. A circle
 * that reaches a pole spans every longitude.
 */
export const circleBoundsPoints = (
  center: MapLatLng,
  radiusMeters: number
): MapLatLng[] => {
  const angular = radiusMeters / EARTH_RADIUS;
  const latMin = Math.max(-90, center[0] - toDegrees(angular));
  const latMax = Math.min(90, center[0] + toDegrees(angular));
  const sinRatio = Math.sin(angular) / Math.cos(toRadians(center[0]));
  if (latMin <= -90 || latMax >= 90 || Math.abs(sinRatio) >= 1) {
    return [
      [latMin, -180],
      [latMax, 180],
    ];
  }
  const dLng = toDegrees(Math.asin(sinRatio));
  return [
    [latMin, center[1] - dLng],
    [latMax, center[1] + dLng],
  ];
};

const MERCATOR_MAX_LAT = 85.051129;

const projectMercator = ([lat, lng]: MapLatLng, scale: number) => {
  const sinLat = Math.sin(
    toRadians(Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat)))
  );
  return {
    x: (lng / 360 + 0.5) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
};

export const pixelDistance = (
  a: MapLatLng,
  b: MapLatLng,
  zoom: number
): number => {
  const scale = 256 * 2 ** zoom;
  const pa = projectMercator(a, scale);
  const pb = projectMercator(b, scale);
  const dx = Math.abs(pa.x - pb.x);
  return Math.hypot(Math.min(dx, scale - dx), pa.y - pb.y);
};
