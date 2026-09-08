/**
 * Map engine abstraction for ha-map: MapLibre GL where WebGL2 is available,
 * Leaflet as the viewing fallback. The Leaflet engine is frozen at this
 * contract; new capabilities go on MapLibre only, as optional members like
 * `editing`.
 *
 * Positions are [latitude, longitude]; zoom levels use Leaflet semantics.
 */

export type MapLatLng = [latitude: number, longitude: number];

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
}

export interface MapEngineOptions {
  center: MapLatLng;
  zoom: number;
  darkMode: boolean;
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
}

export interface MapMarkerOptions {
  /** Rendered size of the element in pixels */
  size: [width: number, height: number];
  /** Point of the element placed on the coordinate, from its top left; defaults to the center */
  anchor?: [x: number, y: number];
  /** Takes pointer input and keyboard focus; defaults to true */
  interactive?: boolean;
  /** Accessible name */
  title?: string;
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
  /** Builds a cluster's element; called when its members change and on refreshClusters() */
  iconBuilder(members: MapMarkerHandle[], location: MapLatLng): MapClusterIcon;
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

  setDarkMode(darkMode: boolean): void;

  setZoomControlPosition(position: MapControlPosition): void;

  /** Show a scale ruler (bottom start); null hides it */
  setScaleRuler(options: { metric: boolean } | null): void;

  setView(center: MapLatLng, zoom?: number): void;

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
  addCircle(center: MapLatLng, options: MapCircleOptions): MapItemHandle;

  /** Editing support, MapLibre only; undefined on the Leaflet fallback */
  editing?: MapEditingSupport;

  /** Draw one history trail (points with tooltips, connecting segments) */
  addPath(path: MapPath): MapItemHandle;

  /** Cluster the markers added with cluster: true; call after each batch of addMarker calls */
  setClustering(options: MapClusterOptions | null): void;

  /** Rebuild cluster icons without regrouping (e.g. after a style change) */
  refreshClusters(): void;
}

const EARTH_RADIUS = 6371008.8;

/** Great-circle distance in meters */
export const distanceMeters = (a: MapLatLng, b: MapLatLng): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
};

/** The point the given distance due east of center, e.g. for a resize handle */
export const pointEastOf = (
  center: MapLatLng,
  distanceInMeters: number
): MapLatLng => {
  // Clamped like circleBoundsPoints, so the handle stays near polar circles
  const lngOffset =
    (distanceInMeters /
      (EARTH_RADIUS * Math.max(Math.cos((center[0] * Math.PI) / 180), 0.01))) *
    (180 / Math.PI);
  return [center[0], center[1] + lngOffset];
};

/** Bounding box corners of a circle, for fitting a radius into view */
export const circleBoundsPoints = (
  center: MapLatLng,
  radiusMeters: number
): MapLatLng[] => {
  const latOffset = radiusMeters / 111320;
  const lngOffset =
    latOffset / Math.max(Math.cos((center[0] * Math.PI) / 180), 0.01);
  return [
    [center[0] - latOffset, center[1] - lngOffset],
    [center[0] + latOffset, center[1] + lngOffset],
  ];
};
