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
import type maplibregl from "maplibre-gl";
import { setMarkerAccessibility } from "../marker-accessibility";
import {
  CONTEXT_RESTORE_GRACE,
  ensureRTLTextPlugin,
  loadStyle,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  RECOVERY_THROTTLE,
  VECTOR_STYLES,
} from "../base-layer";
import {
  refreshMapTilesToken,
  subscribeMapTilesToken,
  withMapTilesToken,
} from "../../../data/map_tiles";
import { isTouch } from "../../../util/is_touch";
import type {
  MapCircleOptions,
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
} from "../map-engine";
import { distanceMeters, pointEastOf } from "../map-engine";
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

// Roughly one zoom level per two wheel notches (MapLibre's default is 1/450)
const WHEEL_ZOOM_RATE = 1 / 200;

// Regroup clusters once continuous zooming settles, not on every wheel notch
const CLUSTER_REBUILD_DELAY = 120;

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
};

// A meter-radius circle as a polygon (spherical approximation)
const circlePolygon = (
  center: MapLatLng,
  radiusMeters: number
): Feature<Polygon> => {
  const steps = 64;
  const latOffset = radiusMeters / 111320;
  const lngOffset =
    latOffset / Math.max(Math.cos((center[0] * Math.PI) / 180), 0.01);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (2 * Math.PI * i) / steps;
    ring.push([
      center[1] + lngOffset * Math.sin(theta),
      center[0] + latOffset * Math.cos(theta),
    ]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
};

interface ManagedMarker {
  element: HTMLElement;
  location: MapLatLng;
  options: MapMarkerOptions;
  handle: MapEditableMarkerHandle;
  draggable?: boolean;
  onDragEnd?: (location: MapLatLng) => void;
  dragging?: boolean;
  /** Pre-drag location; the next update echoing it is ignored (see setLocation) */
  staleLocation?: MapLatLng;
  mlMarker?: MapLibreMarker;
  decoration?: MapItemHandle;
  removed?: boolean;
}

interface ClusterGroup {
  /** Members are shown in a bubble at their spot instead of an icon */
  open?: boolean;
  members: ManagedMarker[];
  center: MapLatLng;
  iconMarker?: MapLibreMarker;
}

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

  // A failed style request rolls back to the applied mode, not the requested one
  private _appliedDarkMode = false;

  private _requestedDarkMode = false;

  private _latestStyleRequest = 0;

  private _contextLost = false;

  private _fallbackTimeout?: number;

  private _destroyed = false;

  private _refused = false;

  private _unsubscribeToken?: () => void;

  private _resizing = false;

  private _settleInit?: () => void;

  public async init(
    container: HTMLElement,
    options: MapEngineOptions
  ): Promise<void> {
    if (options.rasterOnly) {
      throw new Error("The MapLibre engine cannot render without WebGL");
    }
    const maplibre = (await import("maplibre-gl")).default;
    this._maplibre = maplibre;
    ensureRTLTextPlugin(maplibre.setRTLTextPlugin);

    // MapLibre's stylesheet for controls and popups; one link per root
    const root = container.parentNode;
    if (root && !root.querySelector(`link[href="${MAPLIBRE_CSS_URL}"]`)) {
      const style = document.createElement("link");
      style.setAttribute("href", MAPLIBRE_CSS_URL);
      style.setAttribute("rel", "stylesheet");
      root.appendChild(style);
    }

    this._appliedDarkMode = options.darkMode;
    this._requestedDarkMode = options.darkMode;
    this._events = options.events;

    const style = await loadStyle(
      VECTOR_STYLES[options.darkMode ? "dark" : "light"]
    );
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
        url: withMapTilesToken(url),
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
    // Only a new token clears a refusal; a theme change in between is refused too
    this._unsubscribeToken = subscribeMapTilesToken(() => {
      if (this._refused) {
        this._refused = false;
        this._applyStyle(this._requestedDarkMode);
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
    map.on("zoomstart", () => this._events.zoomStart?.());
    map.on("movestart", () => {
      // resize() fires movestart even when nothing changed (see _resize)
      if (!this._resizing) {
        this._events.moveStart?.();
      }
    });
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
    this._clusterGroups.forEach((group) => group.iconMarker?.remove());
    this._clusterGroups = [];
    this._markers = [];
    this._pendingStyleOps = [];
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

  public setDarkMode(darkMode: boolean): void {
    if (!this._map || darkMode === this._requestedDarkMode) {
      return;
    }
    this._requestedDarkMode = darkMode;
    this._applyStyle(darkMode);
  }

  private _applyStyle(darkMode: boolean): void {
    const request = ++this._latestStyleRequest;

    loadStyle(VECTOR_STYLES[darkMode ? "dark" : "light"])
      .then((style) => {
        if (request === this._latestStyleRequest && this._map) {
          this._map.setStyle(style, {
            transformStyle: (previous, next) =>
              this._carryCustomLayers(previous, next),
          });
          this._appliedDarkMode = darkMode;
        }
      })
      .catch(() => {
        if (request === this._latestStyleRequest) {
          this._requestedDarkMode = this._appliedDarkMode;
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
    const point = this._map!.project([location[1], location[0]]);
    return { x: point.x, y: point.y };
  }

  public fitBounds(points: MapLatLng[], options?: MapFitOptions): void {
    if (!this._map || !this._maplibre || !points.length) {
      return;
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
    if (minLat === maxLat && minLng === maxLng) {
      // Zero-area bounds: center on the point
      this._map.easeTo({
        center: [minLng, minLat],
        zoom: maxZoom ?? this._map.getZoom(),
        animate: options?.animate,
      });
      return;
    }
    const pad = options?.pad ?? 0.5;
    const latPad = (maxLat - minLat) * pad;
    const lngPad = (maxLng - minLng) * pad;
    this._map.fitBounds(
      [
        [minLng - lngPad, minLat - latPad],
        [maxLng + lngPad, maxLat + latPad],
      ],
      { maxZoom, animate: options?.animate }
    );
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
    if (options.interactive ?? true) {
      element.tabIndex = 0;
    } else {
      // Leaflet lets input through non-interactive markers; MapLibre does not
      element.style.pointerEvents = "none";
    }
    setMarkerAccessibility(element, options.title, options.interactive ?? true);

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
        if (managed.dragging) {
          return;
        }
        // Skip one update echoing the pre-drag location (the save has not returned yet)
        const stale = managed.staleLocation;
        managed.staleLocation = undefined;
        if (
          stale &&
          newLocation[0] === stale[0] &&
          newLocation[1] === stale[1]
        ) {
          return;
        }
        managed.location = newLocation;
        managed.mlMarker?.setLngLat([newLocation[1], newLocation[0]]);
      },
      remove: () => {
        managed.removed = true;
        this._hideMarker(managed);
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
          managed.staleLocation = managed.location;
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
  ): MapItemHandle {
    if (!this._map) {
      return { remove: () => undefined };
    }
    const id = `${CUSTOM_PREFIX}circle-${this._idCounter++}`;
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
    return {
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
    if (options.onClick) {
      centerEl.tabIndex = 0;
    }
    setMarkerAccessibility(centerEl, options.title, !!options.onClick);
    const centerMarker = new maplibre.Marker({
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

    if (options.resizable) {
      const east = pointEastOf(center, options.radius);
      resizeHandle = createResizeHandleElement(options.resizeLabel);
      resizeMarker = new maplibre.Marker({
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
          options.onResize?.(currentRadius);
        }
      };
      resizeHandle.addEventListener("keyup", commitKeyboardResize);
      // Focus can leave while a key is still held
      resizeHandle.addEventListener("blur", commitKeyboardResize);
    }

    // Skip one update echoing the pre-drag values (the save has not returned yet)
    let dragging = false;
    let staleCenter: MapLatLng | undefined;
    let staleRadius: number | undefined;
    [centerMarker, resizeMarker].forEach((handleMarker) => {
      handleMarker?.on("dragstart", () => {
        dragging = true;
        staleCenter = currentCenter;
        staleRadius = currentRadius;
      });
      handleMarker?.on("dragend", () => {
        dragging = false;
      });
    });
    const isStale = (candidateCenter: MapLatLng, candidateRadius: number) =>
      staleCenter !== undefined &&
      staleRadius !== undefined &&
      candidateCenter[0] === staleCenter[0] &&
      candidateCenter[1] === staleCenter[1] &&
      candidateRadius === staleRadius;

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
        const stale = isStale(newCenter, newRadius);
        staleCenter = undefined;
        staleRadius = undefined;
        if (stale) {
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
        resizeMarker?.remove();
        this._removeCustomLayer(`${id}-fill`);
        this._removeCustomLayer(`${id}-line`);
        this._removeCustomSource(id);
      },
    };
  }

  public addPath(path: MapPath): MapItemHandle {
    if (!this._map || !this._maplibre) {
      return { remove: () => undefined };
    }
    const id = `${CUSTOM_PREFIX}path-${this._idCounter++}`;

    const lines: FeatureCollection = {
      type: "FeatureCollection",
      features: path.segments.map((segment) => ({
        type: "Feature",
        properties: { opacity: segment.opacity ?? 1 },
        geometry: {
          type: "LineString",
          coordinates: segment.points.map((point) => [point[1], point[0]]),
        },
      })),
    };
    const points: FeatureCollection = {
      type: "FeatureCollection",
      features: path.markers.map((pathMarker) => ({
        type: "Feature",
        properties: {
          opacity: pathMarker.opacity ?? 1,
          tooltip: pathMarker.tooltipHtml,
        },
        geometry: {
          type: "Point",
          coordinates: [pathMarker.location[1], pathMarker.location[0]],
        },
      })),
    };

    this._addCustomSource(`${id}-lines`, lines);
    this._addCustomSource(`${id}-points`, points);
    this._addCustomLayer({
      id: `${id}-lines`,
      type: "line",
      source: `${id}-lines`,
      paint: {
        "line-color": path.color,
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
        "circle-color": path.color,
        "circle-opacity": ["get", "opacity"],
        "circle-stroke-width": 2,
        "circle-stroke-color": path.color,
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
    this._whenStyleLoaded(() => {
      const source: GeoJSONSourceSpecification = { type: "geojson", data };
      this._map!.addSource(id, source);
      this._customSources.set(id, source);
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
    this._whenStyleLoaded(() => {
      // Under the labels, over the base cartography
      const symbolLayer = this._map!.getStyle().layers.find(
        (styleLayer) =>
          styleLayer.type === "symbol" && !this._customLayers.has(styleLayer.id)
      );
      this._map!.addLayer(layer, symbolLayer?.id);
      this._customLayers.set(layer.id, layer);
    });
  }

  private _removeCustomLayer(id: string): void {
    this._whenStyleLoaded(() => {
      if (this._map!.getLayer(id)) {
        this._map!.removeLayer(id);
      }
      this._customLayers.delete(id);
    });
  }

  private _removeCustomSource(id: string): void {
    this._whenStyleLoaded(() => {
      if (this._map!.getSource(id)) {
        this._map!.removeSource(id);
      }
      this._customSources.delete(id);
    });
  }

  public setClustering(options: MapClusterOptions | null): void {
    this._clusterOptions = options;
    this._rebuildClusters();
  }

  public refreshClusters(): void {
    this._rebuildClusters(false);
  }

  // Zooming separates members unless they share a spot or the map is already
  // at its maximum zoom
  private _canSeparate(members: ManagedMarker[]): boolean {
    const map = this._map!;
    if (map.getZoom() >= map.getMaxZoom() - 0.01) {
      return false;
    }
    const [first] = members;
    return members.some(
      (managed) =>
        managed.location[0] !== first.location[0] ||
        managed.location[1] !== first.location[1]
    );
  }

  // Shows the members themselves in a bubble whose tail points at their
  // spot, each reachable on its own; the next regroup closes it
  private _openGroup(group: ClusterGroup): void {
    const members = document.createElement("div");
    members.className = "cluster-open-members";
    for (const managed of group.members) {
      this._hideMarker(managed);
      resetMarkerElement(managed.element);
      members.appendChild(managed.element);
    }
    const tail = document.createElement("div");
    tail.className = "cluster-open-tail";
    const root = document.createElement("div");
    root.className = "cluster-open";
    root.append(members, tail);
    group.iconMarker = new this._maplibre!.Marker({
      element: root,
      anchor: "bottom",
    })
      .setLngLat([group.center[1], group.center[0]])
      .addTo(this._map!);
  }

  // Groups clusterable markers by screen distance
  private _rebuildClusters(regroup = true): void {
    if (!this._map) {
      return;
    }
    const clusterable = this._markers.filter(
      (managed) => managed.options.cluster && !managed.removed
    );
    // A member that had focus hands it to the icon replacing it; read before
    // the open bubble holding it is removed
    const active = (
      this._map.getContainer().getRootNode() as Document | ShadowRoot
    ).activeElement;
    const focusedMember = active
      ? clusterable.find((managed) => managed.element.contains(active))
      : undefined;
    this._clusterGroups.forEach((group) => group.iconMarker?.remove());

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

    if (regroup || !this._clusterGroups.length) {
      const { radius, groupKey, groupRadius } = this._clusterOptions;
      const groups: {
        seed: { x: number; y: number };
        members: ManagedMarker[];
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
        for (const members of Object.values(byKey)) {
          const points = members.map((m) => this._project(m.location));
          const xs = points.map((p) => p.x);
          const ys = points.map((p) => p.y);
          const spread = Math.hypot(
            Math.max(...xs) - Math.min(...xs),
            Math.max(...ys) - Math.min(...ys)
          );
          if (members.length > 1 && spread <= (groupRadius ?? radius)) {
            groups.push({ seed: points[0], members });
          } else {
            ungrouped.push(...members);
          }
        }
      } else {
        ungrouped.push(...clusterable);
      }

      for (const managed of ungrouped) {
        const point = this._project(managed.location);
        const group = groups.find(
          (candidate) =>
            Math.hypot(
              candidate.seed.x - point.x,
              candidate.seed.y - point.y
            ) <= radius
        );
        if (group) {
          group.members.push(managed);
        } else {
          groups.push({ seed: point, members: [managed] });
        }
      }
      this._clusterGroups = groups.map((group) => ({
        members: group.members,
        center: [
          group.members.reduce((sum, m) => sum + m.location[0], 0) /
            group.members.length,
          group.members.reduce((sum, m) => sum + m.location[1], 0) /
            group.members.length,
        ] as MapLatLng,
      }));
    }

    for (const group of this._clusterGroups) {
      group.iconMarker = undefined;
      if (group.members.length === 1) {
        this._showMarker(group.members[0]);
        continue;
      }
      if (group.open) {
        this._openGroup(group);
        continue;
      }
      group.members.forEach((managed) => this._hideMarker(managed));

      const icon = this._clusterOptions.iconBuilder(
        group.members.map((managed) => managed.handle),
        group.center
      );
      icon.element.style.width = `${icon.size[0]}px`;
      icon.element.style.height = `${icon.size[1]}px`;
      // Clicking a bubble zooms in on its members; when zooming cannot
      // separate them, they open in a bubble pointing at their spot instead
      const zoomToMembers = () => {
        if (this._canSeparate(group.members)) {
          this.fitBounds(
            group.members.map((managed) => managed.location),
            { pad: 0.3, maxZoom: this._getMaxZoom() }
          );
          return;
        }
        group.open = true;
        group.iconMarker?.remove();
        this._openGroup(group);
      };
      icon.element.tabIndex = 0;
      setMarkerAccessibility(
        icon.element,
        group.members
          .map((managed) => managed.options.title)
          .filter(Boolean)
          .join(", ") || undefined,
        true
      );
      icon.element.addEventListener("click", (ev) => {
        ev.stopPropagation();
        zoomToMembers();
      });
      icon.element.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          zoomToMembers();
          // Keyboard focus follows into the opened bubble
          if (group.open) {
            group.members[0]?.element.focus();
          }
        }
      });
      const location = icon.location ?? group.center;
      group.iconMarker = new this._maplibre!.Marker({
        element: icon.element,
        ...(icon.anchor
          ? {
              anchor: "top-left" as const,
              offset: [-icon.anchor[0], -icon.anchor[1]] as [number, number],
            }
          : {}),
      })
        .setLngLat([location[1], location[0]])
        .addTo(this._map);
    }
    if (focusedMember) {
      const group = this._clusterGroups.find((candidate) =>
        candidate.members.includes(focusedMember)
      );
      if (group?.iconMarker && !group.open) {
        group.iconMarker.getElement().focus();
      }
    }
  }
}
