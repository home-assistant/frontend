import type { Feature, FeatureCollection, Polygon } from "geojson";
import type {
  GeoJSONSource,
  IControl,
  LayerSpecification,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  MapMouseEvent,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import type * as maplibregl from "maplibre-gl";
import {
  clearMarkerAccessibility,
  setMarkerAccessibility,
} from "../marker-accessibility";
import {
  CONTEXT_RESTORE_GRACE,
  ensureRTLTextPlugin,
  ensureWorkerUrl,
  loadStyle,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  RECOVERY_THROTTLE,
} from "../base-layer";
import {
  refreshMapTilesToken,
  subscribeMapTilesToken,
  withMapTilesToken,
} from "../../../data/map_tiles";
import { deepEqual } from "../../util/deep-equal";
import { isTouch } from "../../../util/is_touch";
import type {
  MapCircleHandle,
  MapCircleOptions,
  MapClusterIcon,
  MapClusterOptions,
  MapControlPosition,
  MapDraggableMarkerOptions,
  MapEditableCircleHandle,
  MapEditableCircleOptions,
  MapEditableMarkerHandle,
  MapEditingSupport,
  MapEngine,
  MapMarkerHandle,
  MapEngineEvents,
  MapEngineOptions,
  MapFitOptions,
  MapItemHandle,
  MapLatLng,
  MapMarkerOptions,
  MapPath,
  MapPathHandle,
} from "../map-engine";
import { destinationPoint, distanceMeters, pointEastOf } from "../map-engine";
import type { ResolvedMapStyle } from "../map-styles";
import {
  createResizeHandleElement,
  RADIUS_ARIA_MAX,
  RESIZE_KEY_STEP,
} from "../editable-circle";

type MapLibreModule = typeof maplibregl;

// MapLibre zoom is one level below Leaflet's, which the interface uses
const ZOOM_OFFSET = 1;

// Marks the sources and layers this engine owns, to carry them over style swaps
const CUSTOM_PREFIX = "ha-map-";

const POSITIONS: Record<
  MapControlPosition,
  "top-left" | "top-right" | "bottom-left" | "bottom-right"
> = {
  topleft: "top-left",
  topright: "top-right",
  bottomleft: "bottom-left",
  bottomright: "bottom-right",
};

const MAPLIBRE_CSS_URL = "/static/map/maplibre-gl.css";
// Fully hidden behind the globe, not MapLibre's faint ghost
const MARKER_OPTIONS = { opacityWhenCovered: 0 };

// Roughly one zoom level per two wheel notches (MapLibre's default is 1/450)
const WHEEL_ZOOM_RATE = 1 / 200;

// Regroup clusters once continuous zooming settles, not on every wheel notch
export const CLUSTER_REBUILD_DELAY = 120;

type GeoJSONSourceSpecification = Extract<
  Parameters<MapLibreMap["addSource"]>[1],
  { type: "geojson" }
>;

// A marker element keeps MapLibre's positioning once it leaves the map
const resetMarkerElement = (element: HTMLElement): void => {
  Array.from(element.classList)
    .filter((name) => name.startsWith("maplibregl-marker"))
    .forEach((name) => element.classList.remove(name));
  element.style.transform = "";
  element.style.opacity = "";
  element.style.pointerEvents = "";
  element.style.cursor = "";
  element.style.visibility = "";
};

// A meter-radius circle as a polygon (spherical approximation)
const circlePolygon = (
  center: MapLatLng,
  radiusMeters: number
): Feature<Polygon> => {
  const steps = 64;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const point = destinationPoint(center, radiusMeters, (360 * i) / steps);
    ring.push([point[1], point[0]]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
};

const coloredCircle = (
  center: MapLatLng,
  options: MapCircleOptions
): Feature<Polygon> => ({
  ...circlePolygon(center, options.radius),
  properties: { color: options.color },
});

const pathLines = (path: MapPath): FeatureCollection => ({
  type: "FeatureCollection",
  features: path.segments.map((segment) => ({
    type: "Feature",
    properties: { color: path.color, opacity: segment.opacity ?? 1 },
    geometry: {
      type: "LineString",
      coordinates: segment.points.map((point) => [point[1], point[0]]),
    },
  })),
});

const pathPoints = (path: MapPath): FeatureCollection => ({
  type: "FeatureCollection",
  features: path.markers.map((pathMarker) => ({
    type: "Feature",
    properties: {
      color: path.color,
      opacity: pathMarker.opacity ?? 1,
      tooltip: pathMarker.tooltipHtml,
    },
    geometry: {
      type: "Point",
      coordinates: [pathMarker.location[1], pathMarker.location[0]],
    },
  })),
});

interface ManagedMarker {
  element: HTMLElement;
  location: MapLatLng;
  options: MapMarkerOptions;
  handle: MapEditableMarkerHandle;
  draggable?: boolean;
  onDragEnd?: (location: MapLatLng) => void;
  dragging?: boolean;
  mlMarker?: MapLibreMarker;
  decoration?: MapItemHandle;
  removed?: boolean;
}

// Something on the map by its visual centre: a location, the pixel offset
// from that location to the centre, and half its larger dimension
interface Footprint {
  location: MapLatLng;
  offset: [x: number, y: number];
  half: number;
}

interface EmergingEntry extends Footprint {
  element: HTMLElement;
}

const iconFootprint = (icon: MapClusterIcon, center: MapLatLng): Footprint => ({
  location: icon.location ?? center,
  offset: icon.anchor
    ? [icon.size[0] / 2 - icon.anchor[0], icon.size[1] / 2 - icon.anchor[1]]
    : [0, 0],
  half: Math.max(...icon.size) / 2,
});

const markerFootprint = (managed: ManagedMarker): Footprint => ({
  location: managed.location,
  offset: [0, 0],
  half: Math.max(...managed.options.size) / 2,
});

interface ClusterGroup {
  /** The bubble shows every member instead of a few and a count */
  open?: boolean;
  /** Grouped by key (a zone), so it bubbles even with a single member */
  key?: string;
  members: ManagedMarker[];
  center: MapLatLng;
  /** The bubble to place: closed, or expanded when open */
  icon?: MapClusterIcon;
  /** Whichever icon is on the map, closed or expanded */
  placed?: MapClusterIcon;
  iconMarker?: MapLibreMarker;
}

const centerOf = (members: ManagedMarker[]): MapLatLng => [
  members.reduce((sum, m) => sum + m.location[0], 0) / members.length,
  members.reduce((sum, m) => sum + m.location[1], 0) / members.length,
];

/**
 * The MapLibre GL engine: native vector rendering, requires WebGL2. The host
 * falls back to Leaflet without it or after a fatal context loss.
 */
export class MapLibreMapEngine implements MapEngine {
  private _maplibre?: MapLibreModule;

  private _map?: MapLibreMap;

  private _events: Partial<MapEngineEvents> = {};

  private _zoomControl?: IControl;

  private _scaleControl?: IControl;

  private _markers: ManagedMarker[] = [];

  private _clusterOptions: MapClusterOptions | null = null;

  private _clusterGroups: ClusterGroup[] = [];

  private _clusterRebuildTimeout?: number;

  // Members whose bubble reopens after the zoom towards them
  private _openAfterRegroup?: ManagedMarker[];

  // Regroup as the map will be at this zoom rather than as it is
  private _groupingZoom?: number;

  // Parted from a bubble by a zoom, hidden until clear of it
  private _emerging?: { from: Footprint; entries: EmergingEntry[] };

  private _idCounter = 0;

  // Carried over style swaps, which replace all sources and layers
  // Kept by spec, not id: a style swap arriving while the previous swap is
  // still loading has no previous style to carry them over from
  private _customSources = new Map<string, GeoJSONSourceSpecification>();

  private _customLayers = new Map<string, LayerSpecification>();

  // The only custom layers that take clicks (hover tooltips)
  private _pathPointLayers = new Set<string>();

  // A style swap the differ cannot apply rebuilds the style, which is unloaded
  // until the next frame and throws on mutation; layer work queues until then
  private _pendingStyleOps: (() => void)[] = [];

  // A failed style request rolls back to the applied style, not the requested one
  private _appliedStyle!: ResolvedMapStyle;

  private _requestedStyle!: ResolvedMapStyle;

  private _latestStyleRequest = 0;

  private _contextLost = false;

  private _fallbackTimeout?: number;

  private _destroyed = false;

  private _refused = false;

  private _unsubscribeToken?: () => void;

  private _resizing = false;

  private _settleInit?: () => void;

  // Caller-owned elements on the map, reset when they leave it: a host may
  // reuse them on another engine after a fallback
  private _placedElements = new Set<HTMLElement>();

  public async init(
    container: HTMLElement,
    options: MapEngineOptions
  ): Promise<void> {
    if (options.rasterOnly) {
      throw new Error("The MapLibre engine cannot render without WebGL");
    }
    // MapLibre 6 has no default export.
    const maplibre = await import("maplibre-gl");
    this._maplibre = maplibre;
    ensureWorkerUrl(maplibre.setWorkerUrl);
    ensureRTLTextPlugin(maplibre.setRTLTextPlugin);

    // MapLibre's stylesheet for controls and popups; one link per root
    const root = container.parentNode;
    if (root && !root.querySelector(`link[href="${MAPLIBRE_CSS_URL}"]`)) {
      const style = document.createElement("link");
      style.setAttribute("href", MAPLIBRE_CSS_URL);
      style.setAttribute("rel", "stylesheet");
      root.appendChild(style);
    }

    this._appliedStyle = options.mapStyle;
    this._requestedStyle = options.mapStyle;
    this._events = options.events;

    const style = await loadStyle(options.mapStyle);
    if (this._destroyed) {
      return;
    }

    const map = new maplibre.Map({
      container,
      style,
      center: [options.center[1], options.center[0]],
      zoom: options.zoom - ZOOM_OFFSET,
      minZoom: MAP_MIN_ZOOM - ZOOM_OFFSET,
      maxZoom: MAP_MAX_ZOOM - ZOOM_OFFSET,
      // Dashboards are north-up; no rotate or pitch gestures
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // Rendered with a device font, so these glyphs are never requested
      localIdeographFontFamily: "sans-serif",
      // Inline on wide maps, collapsible (open by default) on narrow ones
      attributionControl: {},
      // Proxied by core behind a token; absolute so the worker can resolve them
      transformRequest: (url) => ({
        ...withMapTilesToken(url),
        referrerPolicy: __DEMO__ ? "origin" : undefined,
      }),
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE);
    this._map = map;

    // A refused TileJSON is never retried, so the style is applied again with
    // a new token. 403: stale token, 404: proxy not registered yet during a
    // restart, no status: network. Throttled so another refusal cannot loop.
    let lastRecovery = 0;
    map.on("error", (event) => {
      const status = (event.error as { status?: number } | undefined)?.status;
      if (status !== undefined && status !== 403 && status !== 404) {
        return;
      }
      if (Date.now() - lastRecovery < RECOVERY_THROTTLE) {
        return;
      }
      lastRecovery = Date.now();
      this._refused = true;
      refreshMapTilesToken();
    });
    // Only a new token clears a refusal; a style change in between is refused too
    this._unsubscribeToken = subscribeMapTilesToken(() => {
      if (this._refused) {
        this._refused = false;
        this._applyStyle(this._requestedStyle);
      }
    });

    this._zoomControl = new maplibre.NavigationControl({ showCompass: false });
    map.addControl(this._zoomControl, POSITIONS[options.zoomControlPosition]);

    map.on("click", (ev) => {
      // Clicks on path points (they have tooltips) are not map clicks
      const pathHit = map
        .queryRenderedFeatures(ev.point)
        .some((feature) => this._pathPointLayers.has(feature.layer.id));
      if (!pathHit) {
        this._events.click?.([ev.lngLat.lat, ev.lngLat.lng]);
      }
    });
    // Everything the first view needs has been drawn; before this the canvas
    // can still be blank, whatever the style says
    map.once("load", () => this._events.drawn?.());
    map.on("zoomstart", () => this._events.zoomStart?.());
    map.on("movestart", () => {
      // resize() fires movestart even when nothing changed (see _resize)
      if (!this._resizing) {
        this._events.moveStart?.();
      }
    });
    map.on("move", () => this._revealEmerged());
    // Grouping depends on screen distances; regroup when the camera settles
    map.on("moveend", () => {
      if (this._clusterOptions) {
        clearTimeout(this._clusterRebuildTimeout);
        this._clusterRebuildTimeout = window.setTimeout(() => {
          this._rebuildClusters();
        }, CLUSTER_REBUILD_DELAY);
      }
    });

    // A lost WebGL context gets a grace period to come back before falling back
    map.on("webglcontextlost", () => {
      this._contextLost = true;
      this._scheduleFatal();
    });
    map.on("webglcontextrestored", () => {
      this._contextLost = false;
      clearTimeout(this._fallbackTimeout);
    });
    document.addEventListener("visibilitychange", this._handleVisibility);

    // Sources and layers can be added once the style has loaded (see
    // _whenStyleLoaded); it was fetched above, so this cannot fail
    await new Promise<void>((resolve) => {
      if (map.getStyle()) {
        resolve();
        return;
      }
      // destroy() settles a pending init, so a host torn down mid-setup
      // gets to finish
      this._settleInit = resolve;
      map.once("style.load", () => resolve());
    });
    this._settleInit = undefined;
  }

  private _handleVisibility = () => {
    if (this._contextLost) {
      this._scheduleFatal();
    }
  };

  private _scheduleFatal(): void {
    clearTimeout(this._fallbackTimeout);
    // Backgrounding drops the context too, and there it comes back on return
    if (this._destroyed || document.hidden) {
      return;
    }
    this._fallbackTimeout = window.setTimeout(() => {
      this._events.fatal?.();
    }, CONTEXT_RESTORE_GRACE);
  }

  public destroy(): void {
    this._destroyed = true;
    this._settleInit?.();
    this._settleInit = undefined;
    this._unsubscribeToken?.();
    clearTimeout(this._fallbackTimeout);
    clearTimeout(this._clusterRebuildTimeout);
    document.removeEventListener("visibilitychange", this._handleVisibility);
    this._revealEmerged(true);
    this._clusterGroups.forEach((group) => group.iconMarker?.remove());
    this._clusterGroups = [];
    this._markers = [];
    this._pendingStyleOps = [];
    this._placedElements.forEach((element) => {
      resetMarkerElement(element);
      clearMarkerAccessibility(element);
    });
    this._placedElements.clear();
    this._map?.remove();
    this._map = undefined;
  }

  public invalidateSize(): void {
    this._resize();
  }

  public hasUsableSize(): boolean {
    if (!this._map) {
      return false;
    }
    const container = this._map.getContainer();
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      this._resize();
      return true;
    }
    return false;
  }

  // MapLibre's resize fires movestart/move/moveend synchronously even when the
  // size did not change; hosts must not read them as camera movement
  private _resize(): void {
    if (!this._map) {
      return;
    }
    this._resizing = true;
    try {
      this._map.resize();
    } finally {
      this._resizing = false;
    }
  }

  public setMapStyle(mapStyle: ResolvedMapStyle): void {
    if (!this._map || deepEqual(mapStyle, this._requestedStyle)) {
      return;
    }
    this._requestedStyle = mapStyle;
    this._applyStyle(mapStyle);
  }

  private _applyStyle(mapStyle: ResolvedMapStyle): void {
    const request = ++this._latestStyleRequest;

    loadStyle(mapStyle)
      .then((style) => {
        if (request === this._latestStyleRequest && this._map) {
          this._map.setStyle(style, {
            transformStyle: (previous, next) =>
              this._carryCustomLayers(previous, next),
          });
          this._appliedStyle = mapStyle;
        }
      })
      .catch(() => {
        if (request === this._latestStyleRequest) {
          this._requestedStyle = this._appliedStyle;
        }
      });
  }

  private _carryCustomLayers(
    _previous: StyleSpecification | undefined,
    next: StyleSpecification
  ): StyleSpecification {
    const sources = { ...next.sources };
    // Our record, not MapLibre's serialization: an update made while the
    // style was unloaded only reached the record
    for (const [id, source] of this._customSources) {
      sources[id] = source;
    }
    const nextIds = new Set(next.layers.map((layer) => layer.id));
    const customLayers = [...this._customLayers.values()].filter(
      (layer) => !nextIds.has(layer.id)
    );
    const layers = [...next.layers];
    const symbolIndex = layers.findIndex((layer) => layer.type === "symbol");
    layers.splice(
      symbolIndex === -1 ? layers.length : symbolIndex,
      0,
      ...customLayers
    );
    return { ...next, sources, layers };
  }

  public setZoomControlPosition(position: MapControlPosition): void {
    if (!this._map || !this._zoomControl) {
      return;
    }
    this._map.removeControl(this._zoomControl);
    this._map.addControl(this._zoomControl, POSITIONS[position]);
  }

  public setScaleRuler(options: { metric: boolean } | null): void {
    if (this._scaleControl) {
      this._map?.removeControl(this._scaleControl);
      this._scaleControl = undefined;
    }
    if (!options || !this._map || !this._maplibre) {
      return;
    }
    this._scaleControl = new this._maplibre.ScaleControl({
      unit: options.metric ? "metric" : "imperial",
    });
    this._map.addControl(this._scaleControl, "bottom-left");
  }

  public setView(center: MapLatLng, zoom?: number): void {
    this._map?.jumpTo({
      center: [center[1], center[0]],
      zoom: zoom !== undefined ? zoom - ZOOM_OFFSET : undefined,
    });
  }

  public setZoom(zoom: number): void {
    this._map?.easeTo({ zoom: zoom - ZOOM_OFFSET });
  }

  private _getMaxZoom(): number {
    return (this._map?.getMaxZoom() ?? 0) + ZOOM_OFFSET;
  }

  private _project(location: MapLatLng): { x: number; y: number } {
    return this._projectAt(
      location,
      this._groupingZoom ?? this._map!.getZoom()
    );
  }

  private _projectAt(
    location: MapLatLng,
    zoom: number
  ): { x: number; y: number } {
    const map = this._map!;
    const point = map.project([location[1], location[0]]);
    const scale = 2 ** (zoom - map.getZoom());
    return { x: point.x * scale, y: point.y * scale };
  }

  public fitBounds(points: MapLatLng[], options?: MapFitOptions): void {
    const fit = this._fitFor(points, options);
    if (fit) {
      this._map!.fitBounds(fit.bounds, {
        ...fit.options,
        animate: options?.animate,
      });
    }
  }

  // The zoom a fit would land on, without moving the map
  private _zoomAfterFit(points: MapLatLng[], options?: MapFitOptions): number {
    const fit = this._fitFor(points, options);
    return (
      (fit && this._map!.cameraForBounds(fit.bounds, fit.options)?.zoom) ??
      this._map!.getZoom()
    );
  }

  private _fitFor(points: MapLatLng[], options?: MapFitOptions) {
    if (!this._map || !this._maplibre || !points.length) {
      return undefined;
    }
    let minLat = points[0][0];
    let maxLat = points[0][0];
    let minLng = points[0][1];
    let maxLng = points[0][1];
    for (const [lat, lng] of points) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    const maxZoom =
      options?.maxZoom !== undefined
        ? options.maxZoom - ZOOM_OFFSET
        : undefined;
    // Passed per fit: easeTo's padding would stick to the map
    const padding = {
      top: options?.padding?.top ?? 0,
      right: options?.padding?.right ?? 0,
      bottom: options?.padding?.bottom ?? 0,
      left: options?.padding?.left ?? 0,
    };
    if (minLat === maxLat && minLng === maxLng) {
      // Zero-area bounds: center on the point, keeping the zoom unless given
      return {
        bounds: [
          [minLng, minLat],
          [minLng, minLat],
        ] as [[number, number], [number, number]],
        options: { maxZoom: maxZoom ?? this._map.getZoom(), padding },
      };
    }
    const pad = options?.pad ?? 0.5;
    const latPad = (maxLat - minLat) * pad;
    const lngPad = (maxLng - minLng) * pad;
    // MapLibre rejects a latitude beyond the poles
    return {
      bounds: [
        [minLng - lngPad, Math.max(-90, minLat - latPad)],
        [maxLng + lngPad, Math.min(90, maxLat + latPad)],
      ] as [[number, number], [number, number]],
      options: { maxZoom, padding },
    };
  }

  public panTo(location: MapLatLng): void {
    this._map?.panTo([location[1], location[0]]);
  }

  public containsLocation(location: MapLatLng): boolean {
    return this._map?.getBounds().contains([location[1], location[0]]) ?? false;
  }

  public addMarker(
    element: HTMLElement,
    location: MapLatLng,
    options: MapMarkerOptions
  ): MapMarkerHandle {
    return this._addMarker(element, location, options);
  }

  public editing: MapEditingSupport = {
    addDraggableMarker: (element, location, options) =>
      this._addMarker(element, location, options, true),
    addEditableCircle: (center, options) =>
      this._addEditableCircle(center, options),
  };

  private _addMarker(
    element: HTMLElement,
    location: MapLatLng,
    options: MapDraggableMarkerOptions,
    draggable = false
  ): MapEditableMarkerHandle {
    element.style.width = `${options.size[0]}px`;
    element.style.height = `${options.size[1]}px`;
    if (options.title) {
      element.title = options.title;
    }
    const interactive = options.interactive ?? true;
    const focusable = options.focusable ?? interactive;
    if (!interactive) {
      // Leaflet lets input through non-interactive markers; MapLibre does not
      element.style.pointerEvents = "none";
    }
    setMarkerAccessibility(element, options.title, focusable);
    if (draggable) {
      // The engine, not the host, knows whether this element really drags
      element.style.cursor = "move";
    }
    this._placedElements.add(element);

    const managed: ManagedMarker = {
      element,
      location,
      options,
      draggable,
      onDragEnd: options.onDragEnd,
      handle: undefined as unknown as MapEditableMarkerHandle,
    };
    managed.handle = {
      get location() {
        return managed.location;
      },
      clusterData: options.clusterData,
      setLocation: (newLocation) => {
        // The user's hand wins while dragging; the host is the truth otherwise
        if (managed.dragging) {
          return;
        }
        managed.location = newLocation;
        managed.mlMarker?.setLngLat([newLocation[1], newLocation[0]]);
      },
      remove: () => {
        managed.removed = true;
        this._hideMarker(managed);
        // Still inside an open cluster bubble otherwise
        element.remove();
        resetMarkerElement(element);
        clearMarkerAccessibility(element);
        this._placedElements.delete(element);
        const index = this._markers.indexOf(managed);
        if (index !== -1) {
          this._markers.splice(index, 1);
        }
      },
    };
    this._markers.push(managed);

    if (!options.cluster) {
      // Clusterable markers appear on the next setClustering call
      this._showMarker(managed);
    }
    return managed.handle;
  }

  private _showMarker(managed: ManagedMarker): void {
    if (!this._map || !this._maplibre || managed.removed) {
      return;
    }
    if (!managed.mlMarker) {
      const { options } = managed;
      managed.mlMarker = new this._maplibre.Marker({
        ...MARKER_OPTIONS,
        element: managed.element,
        draggable: managed.draggable ?? false,
        ...(options.anchor
          ? {
              anchor: "top-left" as const,
              offset: [-options.anchor[0], -options.anchor[1]] as [
                number,
                number,
              ],
            }
          : {}),
      })
        .setLngLat([managed.location[1], managed.location[0]])
        .addTo(this._map);
      if (managed.draggable) {
        managed.mlMarker.on("dragstart", () => {
          managed.dragging = true;
        });
        managed.mlMarker.on("dragend", () => {
          managed.dragging = false;
          const lngLat = managed.mlMarker!.getLngLat();
          managed.location = [lngLat.lat, lngLat.lng];
          managed.onDragEnd?.(managed.location);
        });
      }
    }
    if (managed.options.decoration && !managed.decoration) {
      managed.decoration = this.addCircle(
        managed.location,
        managed.options.decoration
      );
    }
  }

  private _hideMarker(managed: ManagedMarker): void {
    managed.mlMarker?.remove();
    managed.mlMarker = undefined;
    managed.decoration?.remove();
    managed.decoration = undefined;
  }

  public addCircle(
    center: MapLatLng,
    options: MapCircleOptions
  ): MapCircleHandle {
    if (!this._map) {
      return { update: () => undefined, remove: () => undefined };
    }
    const id = `${CUSTOM_PREFIX}circle-${this._idCounter++}`;
    this._addCustomSource(id, coloredCircle(center, options));
    this._addCustomLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.2 },
    });
    this._addCustomLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": ["get", "color"], "line-width": 3 },
    });
    return {
      update: (newCenter, newOptions) => {
        this._setCustomSourceData(id, coloredCircle(newCenter, newOptions));
      },
      remove: () => {
        this._removeCustomLayer(`${id}-fill`);
        this._removeCustomLayer(`${id}-line`);
        this._removeCustomSource(id);
      },
    };
  }

  private _addEditableCircle(
    center: MapLatLng,
    options: MapEditableCircleOptions
  ): MapEditableCircleHandle {
    if (!this._map || !this._maplibre) {
      return {
        center,
        radius: options.radius,
        update: () => undefined,
        remove: () => undefined,
      };
    }
    const map = this._map;
    const maplibre = this._maplibre;
    let currentCenter = center;
    let currentRadius = options.radius;

    const id = `${CUSTOM_PREFIX}editable-${this._idCounter++}`;
    this._addCustomSource(id, circlePolygon(center, options.radius));
    this._addCustomLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": options.color, "fill-opacity": 0.2 },
    });
    this._addCustomLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": options.color, "line-width": 3 },
    });
    // Redraw at most once per frame while dragging
    let frame: number | undefined;
    const redraw = () => {
      if (frame !== undefined) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = undefined;
        this._setCustomSourceData(
          id,
          circlePolygon(currentCenter, currentRadius)
        );
      });
    };

    const centerSize = options.centerSize ?? [16, 16];
    const centerEl = options.centerElement ?? document.createElement("div");
    if (!options.centerElement) {
      centerEl.className = "editable-circle-center";
    }
    centerEl.style.width = `${centerSize[0]}px`;
    centerEl.style.height = `${centerSize[1]}px`;
    if (options.title) {
      centerEl.title = options.title;
    }
    setMarkerAccessibility(centerEl, options.title, !!options.onClick);
    if (options.moveable) {
      centerEl.style.cursor = "move";
    }
    this._placedElements.add(centerEl);
    const centerMarker = new maplibre.Marker({
      ...MARKER_OPTIONS,
      element: centerEl,
      draggable: options.moveable ?? false,
    })
      .setLngLat([center[1], center[0]])
      .addTo(map);

    let resizeMarker: MapLibreMarker | undefined;
    let resizeHandle: HTMLElement | undefined;
    const placeResizeHandle = () => {
      const east = pointEastOf(currentCenter, currentRadius);
      resizeMarker?.setLngLat([east[1], east[0]]);
      const radiusText = String(Math.round(currentRadius));
      resizeHandle?.setAttribute(
        "aria-valuemax",
        String(Math.max(RADIUS_ARIA_MAX, Math.round(currentRadius)))
      );
      resizeHandle?.setAttribute("aria-valuenow", radiusText);
      // Without a value text the value is read as a percentage of the range
      resizeHandle?.setAttribute("aria-valuetext", radiusText);
    };

    // The user's hand wins while dragging; the host is the truth otherwise
    let dragging = false;

    if (options.resizable) {
      const east = pointEastOf(center, options.radius);
      resizeHandle = createResizeHandleElement(options.resizeLabel);
      resizeMarker = new maplibre.Marker({
        ...MARKER_OPTIONS,
        element: resizeHandle,
        draggable: true,
      })
        .setLngLat([east[1], east[0]])
        .addTo(map);
      placeResizeHandle();
      resizeMarker.on("drag", () => {
        const lngLat = resizeMarker!.getLngLat();
        currentRadius = Math.max(
          1,
          distanceMeters(currentCenter, [lngLat.lat, lngLat.lng])
        );
        redraw();
      });
      resizeMarker.on("dragend", () => {
        // Snap the handle back onto the east edge
        placeResizeHandle();
        options.onResize?.(currentRadius);
      });
      // Arrow keys resize in steps, committed on key release
      let keyboardRadius: number | undefined;
      resizeHandle.addEventListener("keydown", (ev) => {
        const direction =
          ev.key === "ArrowRight" || ev.key === "ArrowUp"
            ? 1
            : ev.key === "ArrowLeft" || ev.key === "ArrowDown"
              ? -1
              : 0;
        if (!direction) {
          return;
        }
        ev.preventDefault();
        // MapLibre pans on arrow keys reaching the map
        ev.stopPropagation();
        if (keyboardRadius === undefined) {
          // Host updates treat a key resize like a drag
          dragging = true;
        }
        currentRadius = Math.max(
          1,
          currentRadius * (1 + direction * RESIZE_KEY_STEP)
        );
        keyboardRadius = currentRadius;
        placeResizeHandle();
        redraw();
      });
      const commitKeyboardResize = () => {
        if (keyboardRadius !== undefined) {
          keyboardRadius = undefined;
          dragging = false;
          options.onResize?.(currentRadius);
        }
      };
      resizeHandle.addEventListener("keyup", commitKeyboardResize);
      // Focus can leave while a key is still held
      resizeHandle.addEventListener("blur", commitKeyboardResize);
      // Like the other markers: a click on the handle is not a map click
      resizeHandle.addEventListener("click", (ev) => ev.stopPropagation());
    }

    [centerMarker, resizeMarker].forEach((handleMarker) => {
      handleMarker?.on("dragstart", () => {
        dragging = true;
      });
      handleMarker?.on("dragend", () => {
        dragging = false;
      });
    });

    if (options.moveable) {
      centerMarker.on("drag", () => {
        const lngLat = centerMarker.getLngLat();
        currentCenter = [lngLat.lat, lngLat.lng];
        placeResizeHandle();
        redraw();
      });
      centerMarker.on("dragend", () => options.onMove?.(currentCenter));
    }

    // The center element may be reused for a rebuilt circle; its listeners go with this one
    let removeCenterListeners: (() => void) | undefined;
    if (options.onClick) {
      // A drag can end in a click; only one with its own pointer down counts
      let dragged = false;
      centerMarker.on("dragstart", () => {
        dragged = true;
      });
      const onPointerDown = () => {
        dragged = false;
      };
      const onClick = (ev: MouseEvent) => {
        ev.stopPropagation();
        if (dragged) {
          return;
        }
        options.onClick!();
      };
      const onKeydown = (ev: KeyboardEvent) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          options.onClick!();
        }
      };
      centerEl.addEventListener("pointerdown", onPointerDown);
      centerEl.addEventListener("click", onClick);
      centerEl.addEventListener("keydown", onKeydown);
      removeCenterListeners = () => {
        centerEl.removeEventListener("pointerdown", onPointerDown);
        centerEl.removeEventListener("click", onClick);
        centerEl.removeEventListener("keydown", onKeydown);
      };
    }

    return {
      get center() {
        return currentCenter;
      },
      get radius() {
        return currentRadius;
      },
      update: (newCenter, newRadius) => {
        if (dragging) {
          return;
        }
        currentCenter = newCenter;
        currentRadius = newRadius;
        centerMarker.setLngLat([newCenter[1], newCenter[0]]);
        placeResizeHandle();
        redraw();
      },
      remove: () => {
        if (frame !== undefined) {
          cancelAnimationFrame(frame);
        }
        removeCenterListeners?.();
        centerMarker.remove();
        resetMarkerElement(centerEl);
        clearMarkerAccessibility(centerEl);
        this._placedElements.delete(centerEl);
        resizeMarker?.remove();
        this._removeCustomLayer(`${id}-fill`);
        this._removeCustomLayer(`${id}-line`);
        this._removeCustomSource(id);
      },
    };
  }

  public addPath(path: MapPath): MapPathHandle {
    if (!this._map || !this._maplibre) {
      return { update: () => undefined, remove: () => undefined };
    }
    const id = `${CUSTOM_PREFIX}path-${this._idCounter++}`;

    this._addCustomSource(`${id}-lines`, pathLines(path));
    this._addCustomSource(`${id}-points`, pathPoints(path));
    this._addCustomLayer({
      id: `${id}-lines`,
      type: "line",
      source: `${id}-lines`,
      paint: {
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-opacity": ["get", "opacity"],
      },
    });
    this._addCustomLayer({
      id: `${id}-points`,
      type: "circle",
      source: `${id}-points`,
      paint: {
        "circle-radius": isTouch ? 8 : 3,
        "circle-color": ["get", "color"],
        "circle-opacity": ["get", "opacity"],
        "circle-stroke-width": 2,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": ["get", "opacity"],
      },
    });

    const map = this._map;
    const popup = new this._maplibre.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const layerId = `${id}-points`;
    const showPopup = (ev: MapLayerMouseEvent) => {
      const feature = ev.features?.[0];
      if (!feature || feature.geometry.type !== "Point") {
        return;
      }
      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setHTML(feature.properties?.tooltip ?? "")
        .addTo(map);
    };
    const onEnter = (ev: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      showPopup(ev);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };
    // Touch has no hover: a tap shows the popup, a tap elsewhere dismisses it
    const onMapClick = (ev: MapMouseEvent) => {
      if (!map.queryRenderedFeatures(ev.point, { layers: [layerId] }).length) {
        popup.remove();
      }
    };
    map.on("mouseenter", layerId, onEnter);
    map.on("mouseleave", layerId, onLeave);
    map.on("click", layerId, showPopup);
    map.on("click", onMapClick);
    this._pathPointLayers.add(layerId);

    return {
      update: (next) => {
        this._setCustomSourceData(`${id}-lines`, pathLines(next));
        this._setCustomSourceData(`${id}-points`, pathPoints(next));
      },
      remove: () => {
        map.off("mouseenter", layerId, onEnter);
        map.off("mouseleave", layerId, onLeave);
        map.off("click", layerId, showPopup);
        map.off("click", onMapClick);
        this._pathPointLayers.delete(layerId);
        popup.remove();
        this._removeCustomLayer(`${id}-lines`);
        this._removeCustomLayer(`${id}-points`);
        this._removeCustomSource(`${id}-lines`);
        this._removeCustomSource(`${id}-points`);
      },
    };
  }

  // Runs now, or once the style has loaded. MapLibre serializes nothing
  // until then, so getStyle() is undefined exactly while the style is unloaded
  private _whenStyleLoaded(operation: () => void): void {
    const map = this._map;
    if (!map) {
      return;
    }
    if (map.getStyle()) {
      operation();
      return;
    }
    if (!this._pendingStyleOps.length) {
      map.once("style.load", () => {
        const operations = this._pendingStyleOps;
        this._pendingStyleOps = [];
        operations.forEach((pending) => pending());
      });
    }
    this._pendingStyleOps.push(operation);
  }

  private _addCustomSource(
    id: string,
    data: Feature<Polygon> | FeatureCollection
  ): void {
    // Recorded now, so an update while the style loads reaches the record and
    // a swap in between carries it; the map itself may already have it then
    const source: GeoJSONSourceSpecification = { type: "geojson", data };
    this._customSources.set(id, source);
    this._whenStyleLoaded(() => {
      if (!this._map!.getSource(id)) {
        this._map!.addSource(id, source);
      }
    });
  }

  private _setCustomSourceData(
    id: string,
    data: Feature<Polygon> | FeatureCollection
  ): void {
    const source = this._customSources.get(id);
    if (source) {
      source.data = data;
    }
    (this._map?.getSource(id) as GeoJSONSource | undefined)?.setData(data);
  }

  private _addCustomLayer(layer: LayerSpecification): void {
    this._customLayers.set(layer.id, layer);
    this._whenStyleLoaded(() => {
      if (this._map!.getLayer(layer.id)) {
        return;
      }
      // Under the labels, over the base cartography
      const symbolLayer = this._map!.getStyle().layers.find(
        (styleLayer) =>
          styleLayer.type === "symbol" && !this._customLayers.has(styleLayer.id)
      );
      this._map!.addLayer(layer, symbolLayer?.id);
    });
  }

  private _removeCustomLayer(id: string): void {
    this._customLayers.delete(id);
    this._whenStyleLoaded(() => {
      if (this._map!.getLayer(id)) {
        this._map!.removeLayer(id);
      }
    });
  }

  private _removeCustomSource(id: string): void {
    this._customSources.delete(id);
    this._whenStyleLoaded(() => {
      if (this._map!.getSource(id)) {
        this._map!.removeSource(id);
      }
    });
  }

  public setClustering(options: MapClusterOptions | null): void {
    this._clusterOptions = options;
    this._rebuildClusters();
  }

  public refreshClusters(): void {
    this._rebuildClusters(false);
  }

  // The bubble with every member in it, placed like the closed one
  private _openGroup(group: ClusterGroup): void {
    const icon = group.icon!;
    this._placeIcon(group, icon);
    // The members inside are the buttons; the bubble only names the set
    icon.element.setAttribute("role", "group");
    const title = this._groupTitle(group);
    if (title) {
      icon.element.setAttribute("aria-label", title);
    }
  }

  // The avatar that had focus if the rebuilt bubble kept it, else the first
  // member of an open bubble, the bubble icon or the member itself
  private _focusGroup(
    group: ClusterGroup,
    fallback: HTMLElement,
    previous?: Element | null
  ): void {
    const element = group.iconMarker?.getElement();
    (
      (group.open &&
        ((previous instanceof HTMLElement &&
          element?.contains(previous) &&
          previous) ||
          element?.querySelector<HTMLElement>("[tabindex]"))) ||
      element ||
      fallback
    ).focus();
  }

  private _activeElement(): Element | null {
    return (this._map!.getContainer().getRootNode() as Document | ShadowRoot)
      .activeElement;
  }

  private _groupTitle(group: ClusterGroup): string | undefined {
    return (
      group.members
        .map((managed) => managed.options.title)
        .filter(Boolean)
        .join(", ") || undefined
    );
  }

  private _placeIcon(group: ClusterGroup, icon: MapClusterIcon): void {
    group.members.forEach((managed) => this._hideMarker(managed));
    group.placed = icon;
    icon.element.style.width = `${icon.size[0]}px`;
    icon.element.style.height = `${icon.size[1]}px`;
    const location = icon.location ?? group.center;
    group.iconMarker = new this._maplibre!.Marker({
      ...MARKER_OPTIONS,
      element: icon.element,
      ...(icon.anchor
        ? {
            anchor: "top-left" as const,
            offset: [-icon.anchor[0], -icon.anchor[1]] as [number, number],
          }
        : {}),
    })
      .setLngLat([location[1], location[0]])
      .addTo(this._map!);
  }

  // Whatever the parted members now show as starts hidden, so nothing pops
  // out from under the bubble before the zoom has carried it clear
  private _hideEmerging(members: ManagedMarker[]): void {
    const entries: EmergingEntry[] = [];
    const kept = (group: ClusterGroup) =>
      group.members.filter((managed) => members.includes(managed)).length;
    const staying = this._clusterGroups.reduce((best, group) =>
      kept(group) > kept(best) ? group : best
    );
    for (const group of this._clusterGroups) {
      if (group === staying || !kept(group)) {
        continue;
      }
      if (group.iconMarker && group.placed) {
        entries.push({
          ...iconFootprint(group.placed, group.center),
          element: group.iconMarker.getElement(),
        });
      } else {
        for (const managed of group.members) {
          if (managed.mlMarker) {
            entries.push({
              ...markerFootprint(managed),
              element: managed.element,
            });
          }
        }
      }
    }
    entries.forEach((entry) => {
      entry.element.style.visibility = "hidden";
    });
    const from = staying.placed
      ? iconFootprint(staying.placed, staying.center)
      : markerFootprint(staying.members[0]);
    this._emerging = entries.length ? { from, entries } : undefined;
    // Focus does not stay on something hidden
    const active = this._activeElement();
    if (active && entries.some((entry) => entry.element.contains(active))) {
      this._focusGroup(staying, staying.members[0].element);
    }
  }

  private _centerOf(footprint: Footprint): { x: number; y: number } {
    const point = this._project(footprint.location);
    return {
      x: point.x + footprint.offset[0],
      y: point.y + footprint.offset[1],
    };
  }

  // Shows each entry once its footprint no longer overlaps the bubble's
  private _revealEmerged(all = false): void {
    if (!this._emerging) {
      return;
    }
    const { from } = this._emerging;
    const origin = this._centerOf(from);
    this._emerging.entries = this._emerging.entries.filter((entry) => {
      const point = this._centerOf(entry);
      if (
        !all &&
        Math.hypot(point.x - origin.x, point.y - origin.y) <=
          entry.half + from.half
      ) {
        return true;
      }
      entry.element.style.visibility = "";
      return false;
    });
    if (!this._emerging.entries.length) {
      this._emerging = undefined;
    }
  }

  // Groups clusterable markers by screen distance. With a scope only that
  // group's members regroup; the rest of the map stays as it is
  private _rebuildClusters(regroup = true, scope?: ClusterGroup): void {
    if (!this._map) {
      return;
    }
    this._revealEmerged(true);
    const clusterable = (scope?.members ?? this._markers).filter(
      (managed) => managed.options.cluster && !managed.removed
    );
    // A member or bubble that had focus hands it to the icon replacing it;
    // read before the bubble holding it is removed
    const active = this._activeElement();
    const focusedMember = active
      ? (clusterable.find((managed) => managed.element.contains(active)) ??
        this._clusterGroups.find((group) =>
          group.iconMarker?.getElement().contains(active)
        )?.members[0])
      : undefined;
    (scope ? [scope] : this._clusterGroups).forEach((group) =>
      group.iconMarker?.remove()
    );

    if (!this._clusterOptions) {
      this._clusterGroups = [];
      clusterable.forEach((managed) => this._showMarker(managed));
      return;
    }

    if (!regroup) {
      // Markers removed since the last grouping leave their groups
      this._clusterGroups = this._clusterGroups
        .map((group) => ({
          ...group,
          members: group.members.filter((managed) => !managed.removed),
        }))
        .filter((group) => group.members.length);
    }

    const groups =
      regroup || !this._clusterGroups.length
        ? this._groupMarkers(clusterable)
        : this._clusterGroups;
    this._clusterGroups = scope
      ? this._clusterGroups.filter((group) => group !== scope).concat(groups)
      : groups;

    const pending = regroup ? this._openAfterRegroup : undefined;
    for (const group of groups) {
      group.iconMarker = undefined;
      group.placed = undefined;
      this._prepareGroup(group, pending);
    }
    if (regroup) {
      // A regroup for a coming zoom leaves it for the one after that zoom
      if (this._groupingZoom === undefined) {
        this._openAfterRegroup = undefined;
      }
      this._mergeOverlappingBubbles(pending);
    }

    for (const group of this._clusterGroups) {
      if (group.iconMarker) {
        // Untouched by this rebuild
        continue;
      }
      if (!group.icon) {
        this._showMarker(group.members[0]);
        continue;
      }
      if (group.open) {
        this._openGroup(group);
        continue;
      }
      const { icon } = group;
      this._placeIcon(group, icon);
      // Zooms in on the members, regrouped up front as they will sit once the
      // zoom lands: leavers part now and the bubble opens for the rest
      const zoomToMembers = () => {
        const { members } = group;
        const locations = members.map((managed) => managed.location);
        const fit = { pad: 0.3, maxZoom: this._getMaxZoom() };
        this._openAfterRegroup = members;
        this._groupingZoom = this._zoomAfterFit(locations, fit);
        try {
          this._rebuildClusters(true, group);
        } finally {
          this._groupingZoom = undefined;
        }
        this._hideEmerging(members);
        this.fitBounds(locations, fit);
      };
      setMarkerAccessibility(icon.element, this._groupTitle(group), true);
      icon.element.addEventListener("click", (ev) => {
        ev.stopPropagation();
        zoomToMembers();
      });
      icon.element.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          zoomToMembers();
        }
      });
    }
    if (focusedMember) {
      const group = this._clusterGroups.find((candidate) =>
        candidate.members.includes(focusedMember)
      );
      if (group) {
        // A singleton group has no bubble icon; the member shows on its own,
        // so send focus back to that member rather than to the document.
        this._focusGroup(group, focusedMember.element, active);
      }
    }
  }

  private _groupMarkers(clusterable: ManagedMarker[]): ClusterGroup[] {
    const { radius, groupKey, groupRadius } = this._clusterOptions!;
    const groups: {
      points: { x: number; y: number }[];
      members: ManagedMarker[];
      key?: string;
    }[] = [];

    // Keyed groups first; one spread too wide falls through to proximity
    const ungrouped: ManagedMarker[] = [];
    if (groupKey) {
      const byKey: Record<string, ManagedMarker[]> = {};
      for (const managed of clusterable) {
        const key = groupKey(managed.handle);
        if (key === undefined) {
          ungrouped.push(managed);
        } else {
          (byKey[key] ??= []).push(managed);
        }
      }
      for (const [key, members] of Object.entries(byKey)) {
        const points = members.map((m) => this._project(m.location));
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const spread = Math.hypot(
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys)
        );
        // A keyed group (a zone) bubbles even with a single member, so a lone
        // person or device in a zone still shows in a bubble pinned to it.
        if (members.length === 1 || spread <= (groupRadius ?? radius)) {
          groups.push({ points, members, key });
        } else {
          ungrouped.push(...members);
        }
      }
    } else {
      ungrouped.push(...clusterable);
    }

    for (const managed of ungrouped) {
      const point = this._project(managed.location);
      const group = groups.find((candidate) =>
        candidate.points.some(
          (member) =>
            Math.hypot(member.x - point.x, member.y - point.y) <= radius
        )
      );
      if (group) {
        group.members.push(managed);
        group.points.push(point);
      } else {
        groups.push({ points: [point], members: [managed] });
      }
    }
    return groups.map((group) => ({
      members: group.members,
      key: group.key,
      center: centerOf(group.members),
    }));
  }

  private _atMaxZoom(): boolean {
    const map = this._map!;
    return (this._groupingZoom ?? map.getZoom()) >= map.getMaxZoom() - 0.01;
  }

  // Whether the members would still share one bubble at the maximum zoom, by
  // the grouping rule: keyed within the group radius, else each within the
  // radius of another
  private _staysTogetherZoomedIn(group: ClusterGroup): boolean {
    const maxZoom = this._map!.getMaxZoom();
    const points = group.members.map((managed) =>
      this._projectAt(managed.location, maxZoom)
    );
    const { radius, groupRadius } = this._clusterOptions!;
    if (group.key !== undefined) {
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const spread = Math.hypot(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys)
      );
      if (spread <= (groupRadius ?? radius)) {
        return true;
      }
    }
    const linked = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const from = points[queue.pop()!];
      points.forEach((point, index) => {
        if (
          !linked.has(index) &&
          Math.hypot(point.x - from.x, point.y - from.y) <= radius
        ) {
          linked.add(index);
          queue.push(index);
        }
      });
    }
    return linked.size === points.length;
  }

  private _buildIcon(group: ClusterGroup, expanded = false): MapClusterIcon {
    return this._clusterOptions!.iconBuilder(
      group.members.map((managed) => managed.handle),
      group.center,
      group.key,
      expanded
    );
  }

  private _iconRect(group: ClusterGroup) {
    const { size, anchor, location } = group.icon!;
    const point = this._project(location ?? group.center);
    const [left, top] = anchor
      ? [point.x - anchor[0], point.y - anchor[1]]
      : [point.x - size[0] / 2, point.y - size[1] / 2];
    return { left, top, right: left + size[0], bottom: top + size[1] };
  }

  // Decides whether the group bubbles and whether that bubble is open, and
  // builds the icon to place
  private _prepareGroup(group: ClusterGroup, pending?: ManagedMarker[]): void {
    // A lone non-keyed marker shows plainly; a lone zone occupant falls
    // through to the bubble path so it renders in a bubble at its zone.
    const bubbles = group.members.length > 1 || group.key !== undefined;
    // Nothing splits a bubble at the maximum zoom, so all open there; below
    // it only the activated one, when zooming further could not part it
    if (
      bubbles &&
      !group.open &&
      (this._atMaxZoom() ||
        (pending?.some((managed) => group.members.includes(managed)) &&
          this._staysTogetherZoomedIn(group)))
    ) {
      group.open = true;
    }
    group.icon = bubbles ? this._buildIcon(group, group.open) : undefined;
  }

  private _mergeOverlappingBubbles(pending?: ManagedMarker[]): void {
    for (;;) {
      const bubbles = this._clusterGroups.filter((group) => group.icon);
      const rects = bubbles.map((group) => this._iconRect(group));
      let pair: [ClusterGroup, ClusterGroup] | undefined;
      for (let i = 0; i < bubbles.length && !pair; i++) {
        for (let j = i + 1; j < bubbles.length && !pair; j++) {
          const a = rects[i];
          const b = rects[j];
          if (
            a.left < b.right &&
            b.left < a.right &&
            a.top < b.bottom &&
            b.top < a.bottom
          ) {
            pair = [bubbles[i], bubbles[j]];
          }
        }
      }
      if (!pair) {
        return;
      }
      const members = [...pair[0].members, ...pair[1].members];
      pair.forEach((group) => group.iconMarker?.remove());
      // Two zones cannot share a pinned bubble
      const keys = [pair[0].key, pair[1].key].filter(
        (key) => key !== undefined
      );
      const merged: ClusterGroup = {
        members,
        key: keys.length === 1 ? keys[0] : undefined,
        center: centerOf(members),
      };
      this._prepareGroup(merged, pending);
      this._clusterGroups = this._clusterGroups
        .filter((group) => !pair!.includes(group))
        .concat(merged);
    }
  }
}
