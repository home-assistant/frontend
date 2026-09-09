/**
 * Engine abstraction for ha-map.
 *
 * ha-map keeps all Home Assistant semantics (entities, zones, cluster bubble
 * DOM, history path math, fit policy) and delegates the primitive map
 * operations to a MapEngine, so the engine can be selected at runtime:
 * MapLibre GL native where WebGL2 is available, Leaflet otherwise (and always
 * for ha-locations-editor, which edits with leaflet-draw).
 *
 * The interface exposes no engine types: positions are [latitude, longitude]
 * tuples and marker content is caller-owned HTML elements.
 *
 * Zoom levels use Leaflet semantics (zoom 0 = one world tile), the historical
 * convention across Home Assistant map configs. The MapLibre engine converts
 * internally (MapLibre zoom = Leaflet zoom - 1).
 */

export type MapLatLng = [latitude: number, longitude: number];

export interface MapPoint {
  x: number;
  y: number;
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

  // Content ------------------------------------------------------------

  /**
   * Place an HTML element on the map. The element is owned by the caller;
   * the engine positions it and, for interactive markers, makes it
   * focusable.
   */
  addMarker(
    element: HTMLElement,
    location: MapLatLng,
    options: MapMarkerOptions
  ): MapMarkerHandle;

  /** Draw a meter-radius circle (zone radius) */
  addCircle(center: MapLatLng, options: MapCircleOptions): MapItemHandle;

  /** Draw one history trail (points with tooltips, connecting segments) */
  addPath(path: MapPath): MapItemHandle;

  /**
   * Enable or disable clustering of the markers added with cluster: true.
   * Must be called after each batch of addMarker calls to place clusterable
   * markers on the map; null places them unclustered.
   */
  setClustering(options: MapClusterOptions | null): void;

  /** Rebuild cluster icons without regrouping (e.g. after a style change) */
  refreshClusters(): void;
}

/**
 * Bounding box corners of a circle, for fitting a radius into view without
 * engine-specific circle bounds.
 */
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
