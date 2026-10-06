import { isToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, ReactiveElement, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  consume,
  ContextSubscriptionController,
} from "../../common/decorators/consume";
import { formatDateTime } from "../../common/datetime/format_date_time";
import {
  formatTimeWeekday,
  formatTimeWithSeconds,
} from "../../common/datetime/format_time";
import { UNIT_KM } from "../../common/const";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityLocation } from "../../common/entity/get_entity_location";
import { supportsVectorMaps } from "../../common/map/base-layer";
import type {
  MapCircleHandle,
  MapClusterIcon,
  MapControlPosition,
  MapEngine,
  MapFitPadding,
  MapItemHandle,
  MapLatLng,
  MapMarkerHandle,
  MapPath,
  MapPathHandle,
  MapPathMarker,
  MapPathSegment,
  MapEditableCircleHandle,
  MapEditableMarkerHandle,
  MapEditingSupport,
  MapView,
} from "../../common/map/map-engine";
import {
  circleBoundsPoints,
  distanceMeters,
} from "../../common/map/map-engine";
import type { MapStyleConfig } from "../../common/map/map-styles";
import { resolveMapStyle } from "../../common/map/map-styles";
import { readMapThemeColors } from "../../common/map/map-theme-colors";
import { editableCircleStyles } from "../../common/map/editable-circle";
import { entityMapColor, zoneColor } from "../../common/map/entity-map-colors";
import {
  clearMarkerAccessibility,
  setMarkerAccessibility,
} from "../../common/map/marker-accessibility";
import {
  createZoneMarkerElement,
  ZONE_CIRCLE_SIZE,
  zoneMarkerStyles,
} from "../../common/map/zone-marker";
import { deepEqual } from "../../common/util/deep-equal";
import { filterXSS } from "../../common/util/xss";
import {
  configContext,
  connectionContext,
  formattersContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../data/context";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import { ensureMapTilesToken } from "../../data/map_tiles";
import "../ha-tooltip";
import type {
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
  ThemeMode,
} from "../../types";
import { FLOATING_LIFT, floatingMarkerFootprint } from "./ha-entity-marker";

declare global {
  // for fire event
  interface HASSDomEvents {
    "map-clicked": { location: [number, number] };
  }
}

const PROGRAMMITIC_FIT_DELAY = 250;

// An engine that never reports a drawn frame must not leave an empty card
const DRAWN_FALLBACK = 3000;

const getEntityId = (entity: string | HaMapEntity): string =>
  typeof entity === "string" ? entity : entity.entity_id;

export interface HaMapPathPoint {
  point: MapLatLng;
  timestamp: Date;
}
export interface HaMapPaths {
  points: HaMapPathPoint[];
  color?: string;
  name?: string;
  gradualOpacity?: number;
  fullDatetime?: boolean;
}

export const MAP_CARD_MARKER_LABEL_MODES = [
  "name",
  "state",
  "attribute",
  "icon",
] as const;
export type MapCardMarkerLabelMode =
  (typeof MAP_CARD_MARKER_LABEL_MODES)[number];

/** A location drawn for editing: a draggable marker, or a circle with a moveable center and radius */
export interface HaMapEditableLocation {
  id: string;
  location: MapLatLng;
  radius?: number;
  /** Element shown at the location, e.g. a named icon */
  element?: HTMLElement;
  elementSize?: [width: number, height: number];
  title?: string;
  color?: string;
  locationEditable?: boolean;
  radiusEditable?: boolean;
  /** Activating the marker fires editable-location-clicked; otherwise it is not a button */
  activatable?: boolean;
  /** Counts toward the map fit; defaults to true */
  fit?: boolean;
}

// Geometry is updated in place; a change to anything else rebuilds the marker
const sameAppearance = (
  a: HaMapEditableLocation,
  b: HaMapEditableLocation
): boolean =>
  a.element === b.element &&
  a.title === b.title &&
  a.color === b.color &&
  a.locationEditable === b.locationEditable &&
  a.radiusEditable === b.radiusEditable &&
  a.activatable === b.activatable &&
  a.elementSize?.[0] === b.elementSize?.[0] &&
  a.elementSize?.[1] === b.elementSize?.[1];

// Without editing support (the Leaflet fallback) locations are static and redrawn on edits
const staticEditing = (engine: MapEngine): MapEditingSupport => ({
  addDraggableMarker: (element, location, options) => {
    let current = location;
    let marker = engine.addMarker(element, current, options);
    return {
      get location() {
        return current;
      },
      clusterData: options.clusterData,
      setLocation: (newLocation) => {
        marker.remove();
        current = newLocation;
        marker = engine.addMarker(element, current, options);
      },
      remove: () => marker.remove(),
    };
  },
  addEditableCircle: (center, options) => {
    const centerEl = options.centerElement ?? document.createElement("div");
    if (!options.centerElement) {
      centerEl.className = "editable-circle-center";
    }
    // The center element may be reused for a rebuilt circle; the listeners go with this one
    let removeListeners: (() => void) | undefined;
    if (options.onClick) {
      const onClick = (ev: Event) => {
        ev.stopPropagation();
        options.onClick!();
      };
      const onKeydown = (ev: KeyboardEvent) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          options.onClick!();
        }
      };
      centerEl.addEventListener("click", onClick);
      centerEl.addEventListener("keydown", onKeydown);
      removeListeners = () => {
        centerEl.removeEventListener("click", onClick);
        centerEl.removeEventListener("keydown", onKeydown);
      };
    }
    let current = { center, radius: options.radius };
    let items: MapItemHandle[] = [];
    const draw = () => {
      items = [
        engine.addCircle(current.center, {
          radius: current.radius,
          color: options.color,
        }),
        engine.addMarker(centerEl, current.center, {
          size: options.centerSize ?? [16, 16],
          interactive: !!options.onClick,
          title: options.title,
          nativeTitle: options.nativeTitle,
        }),
      ];
    };
    draw();
    return {
      get center() {
        return current.center;
      },
      get radius() {
        return current.radius;
      },
      update: (newCenter, newRadius) => {
        items.forEach((item) => item.remove());
        current = { center: newCenter, radius: newRadius };
        draw();
      },
      remove: () => {
        removeListeners?.();
        items.forEach((item) => item.remove());
      },
    };
  },
});

declare global {
  interface HASSDomEvents {
    "editable-location-moved": { id: string; location: MapLatLng };
    "editable-location-resized": { id: string; radius: number };
    "editable-location-clicked": { id: string };
    /** Whether the loaded engine can edit; false on the Leaflet fallback */
    "editing-available-changed": { available: boolean };
  }
}

export interface HaMapEntity {
  entity_id: string;
  color: string;
  label_mode?: MapCardMarkerLabelMode;
  attribute?: string;
  unit?: string;
  name?: string;
  focus?: boolean;
  hide_accuracy?: boolean;
  hide_radius?: boolean;
  selected?: boolean;
}

// Data carried by entity markers for rendering cluster bubbles
interface ClusterData {
  entityId: string;
  title: string;
  picture?: string;
  label: string;
  showIcon: boolean;
  unit: string;
  color?: string;
  selected: boolean;
  zoneId?: string;
}

const CLUSTER_AVATAR_SIZE = 32;
const CLUSTER_BUBBLE_PADDING = 6;
const CLUSTER_BUBBLE_GAP = 4;
// Space an opened bubble keeps from the map edges
const CLUSTER_BUBBLE_MARGIN = 12;
// Beyond this the last slot becomes a count
const CLUSTER_MAX_AVATARS = 4;
const CLUSTER_MORE_WIDTH = 28;
const CLUSTER_MORE_MAX = 99;
const CLUSTER_TAIL_SIZE = 10;
// The tail is a rotated square on the bubble's bottom edge, reaching half its diagonal below
const CLUSTER_TAIL_HEIGHT = Math.round((CLUSTER_TAIL_SIZE * Math.SQRT2) / 2);
const CLUSTER_ZONE_SPACING = 2;
const CLUSTER_RADIUS = 40;
// Same-zone markers share the zone's bubble while they span at most this many
// pixels; further apart they show their actual positions
const ZONE_GROUP_RADIUS = 160;
// Circle radius (meters) for a selected marker without a reported accuracy
const NOMINAL_ACCURACY = 2.5;
// Fixes this good (meters) draw a soft disc without an outline
const PRECISE_GPS_ACCURACY = 10;

type EntityMarkerElement = HTMLElementTagNameMap["ha-entity-marker"];

// Exposes each marker's parts on ha-map, generically and per entity
const exportedMarkerParts = (entityId: string): string => {
  const suffix = entityId.replace(".", "-");
  return `marker, picture, marker: marker-${suffix}, picture: picture-${suffix}`;
};

// The cached element serves again once it left the screen; Leaflet keeps an
// outgoing bubble on screen during its zoom animation
const takeEntityMarker = (
  cache: Map<string, EntityMarkerElement>,
  entityId: string | undefined,
  reusable = true
): EntityMarkerElement => {
  const cached = entityId && reusable ? cache.get(entityId) : undefined;
  if (cached && !cached.isConnected) {
    return cached;
  }
  const marker = document.createElement("ha-entity-marker");
  if (entityId) {
    marker.setAttribute("exportparts", exportedMarkerParts(entityId));
    cache.set(entityId, marker);
  }
  return marker;
};

/**
 * @csspart marker - The frame of an entity marker or cluster avatar.
 * @csspart picture - The entity picture inside the frame.
 * @csspart marker-<entity-id> - The frame for one entity, e.g. `marker-person-anne`.
 * @csspart picture-<entity-id> - The picture for one entity.
 */
@customElement("ha-map")
export class HaMap extends ReactiveElement {
  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config!: HassConfig;

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui!: HomeAssistantUI;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: HomeAssistantConnection;

  @property({ attribute: false }) public entities?: string[] | HaMapEntity[];

  @property({ attribute: false }) public paths?: HaMapPaths[];

  /** Locations drawn with drag handles for editing (ha-locations-editor) */
  @property({ attribute: false })
  public editableLocations?: HaMapEditableLocation[];

  @property({ type: Boolean }) public clickable = false;

  @property({ attribute: "auto-fit", type: Boolean }) public autoFit = false;

  @property({ attribute: "render-passive", type: Boolean })
  public renderPassive = false;

  @property({ attribute: "interactive-zones", type: Boolean })
  public interactiveZones = false;

  @property({ attribute: "fit-zones", type: Boolean }) public fitZones = false;

  /** Part of the map an overlay covers; automatic fits keep clear of it */
  @property({ attribute: false }) public fitPadding?: MapFitPadding;

  @property({ attribute: "zoom-position" })
  public zoomPosition: MapControlPosition = "topleft";

  private _zonePositions: Record<string, MapLatLng> = {};

  private _zoneRadii: Record<string, number> = {};

  @property({ attribute: "theme-mode", type: String })
  public themeMode: ThemeMode = "auto";

  /** Cartography to draw; the theme mode picks its light or dark palette */
  @property({ attribute: false })
  public mapStyle?: MapStyleConfig;

  @property({ type: Number }) public zoom = 14;

  @property({ attribute: "cluster-markers", type: Boolean })
  public clusterMarkers = true;

  @property({ attribute: "scale-ruler", type: Boolean })
  public scaleRuler = false;

  @state() private _loaded = false;

  @query("#map") private _mapElement?: HTMLElement;

  private _engine?: MapEngine;

  // Reconciled by id, so updates move handles instead of recreating them
  private _editableHandles = new Map<
    string,
    (
      | { kind: "circle"; handle: MapEditableCircleHandle }
      | { kind: "marker"; handle: MapEditableMarkerHandle }
    ) & {
      source: HaMapEditableLocation;
      /** Detaches what ha-map itself put on the caller's element */
      cleanup?: () => void;
    }
  >();

  private _resizeObserver?: ResizeObserver;

  // Registry creation order decides the palette colors
  @state() private _entityReg: EntityRegistryEntry[] = [];

  private _registryConsumer?: ContextSubscriptionController<
    EntityRegistryEntry[]
  >;

  private _entityHandles: MapMarkerHandle[] = [];

  private _tooltipCount = 0;

  // Marker elements survive redraws so unchanged entities keep their DOM
  private _entityMarkers = new Map<string, EntityMarkerElement>();

  private _clusterAvatars = new Map<string, EntityMarkerElement>();

  private _zoneHandles: MapItemHandle[] = [];

  private _zoneCircleHandles: MapCircleHandle[] = [];

  private _pathHandles: MapPathHandle[] = [];

  private _focusPoints: MapLatLng[] = [];

  private _focusZonePoints: MapLatLng[] = [];

  private _clickCount = 0;

  private _isProgrammaticFit = false;

  private _pauseAutoFit = false;

  private _pendingFit?: () => void;

  public connectedCallback(): void {
    this._pauseAutoFit = false;
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
    this._handleVisibilityChange();
    super.connectedCallback();
    this._loadMap();
    this._attachObserver();
  }

  // Only maps that draw entities ask for the registry; an editor's map, as in
  // onboarding, never does. The context provider shares one subscription.
  private _watchRegistry(): void {
    if (this._registryConsumer || !this.entities?.length) {
      return;
    }
    this._registryConsumer = new ContextSubscriptionController(
      this,
      fullEntitiesContext,
      (entries) => {
        this._entityReg = entries;
      }
    );
  }

  private _handleVisibilityChange = async () => {
    if (!document.hidden) {
      setTimeout(() => {
        this._pauseAutoFit = false;
      }, 500);
    }
  };

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange
    );
    this._engine?.destroy();
    this._engine = undefined;
    // An engine still setting up goes too; its setup notices and stops
    this._setupAttempt++;
    this._startingEngine?.destroy();
    this._startingEngine = undefined;
    this._loading = false;
    clearTimeout(this._drawnFallback);
    this._entityHandles = [];
    this._entityMarkers.clear();
    this._clusterAvatars.clear();
    this._zoneHandles = [];
    this._zoneCircleHandles = [];
    this._pathHandles = [];
    this._removeEditableLocations();
    this._focusPoints = [];
    this._focusZonePoints = [];

    this._pendingFit = undefined;
    this._hasFitted = false;
    this._loaded = false;

    if (this._resizeObserver) {
      this._resizeObserver.unobserve(this);
    }
  }

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);

    if (!this._loaded) {
      return;
    }
    let autoFitRequired = false;
    const oldStates = changedProps.get("_states") as HassEntities | undefined;

    if (changedProps.has("_loaded") || changedProps.has("entities")) {
      this._drawEntities();
      autoFitRequired = !this._pauseAutoFit;
    } else if (this._loaded && oldStates && this.entities) {
      // Check if any state has changed
      for (const entity of this.entities) {
        if (
          oldStates[getEntityId(entity)] !== this._states[getEntityId(entity)]
        ) {
          this._drawEntities();
          autoFitRequired = !this._pauseAutoFit;
          break;
        }
      }
    }

    if (changedProps.has("clusterMarkers") || changedProps.has("_entityReg")) {
      this._drawEntities();
    }

    // An overlay that grew or shrank may cover the fitted markers
    if (
      changedProps.has("fitPadding") &&
      !deepEqual(changedProps.get("fitPadding"), this.fitPadding)
    ) {
      autoFitRequired = !this._pauseAutoFit;
    }

    if (changedProps.has("zoomPosition")) {
      this._engine?.setZoomControlPosition(this.zoomPosition);
    }

    const oldConfig = changedProps.get("_config") as HassConfig | undefined;
    if (
      changedProps.has("_loaded") ||
      changedProps.has("scaleRuler") ||
      (changedProps.has("_config") &&
        oldConfig?.unit_system?.length !== this._config?.unit_system?.length)
    ) {
      this._drawScaleRuler();
    }

    if (changedProps.has("_loaded") || changedProps.has("paths")) {
      this._drawPaths();
      // Cluster bubbles show entity colors only while trails are visible
      const oldPaths = changedProps.get("paths") as HaMapPaths[] | undefined;
      if (!!oldPaths?.length !== !!this.paths?.length) {
        this._engine?.refreshClusters();
      }
    }

    if (changedProps.has("_loaded") || changedProps.has("editableLocations")) {
      // Added or removed locations refit; edits keep the view
      if (this._drawEditableLocations()) {
        autoFitRequired = true;
      }
    } else if (changedProps.has("_i18n") && this._editableHandles.size) {
      // Titles and handle labels are localized when drawn
      this._removeEditableLocations();
      this._drawEditableLocations();
    }

    if (changedProps.has("_loaded") && this._pendingFit) {
      // A fit requested before the engine was ready wins over the default
      this._runPendingFit();
    } else if (
      changedProps.has("_loaded") ||
      (this.autoFit && autoFitRequired)
    ) {
      this.fitMap();
    }

    if (changedProps.has("zoom")) {
      this._withProgrammaticFit(() => {
        this._engine!.setZoom(this.zoom);
      });
    }

    if (changedProps.has("mapStyle")) {
      this._engine?.setMapStyle(this._resolvedMapStyle);
    }

    const oldUi = changedProps.get("_ui") as HomeAssistantUI | undefined;
    if (
      !changedProps.has("themeMode") &&
      (!changedProps.has("_ui") || (oldUi && oldUi.themes === this._ui.themes))
    ) {
      return;
    }

    this._updateMapAppearance();
    // Marker, trail and circle colors were resolved from the theme when drawn
    this._drawEntities();
    this._drawPaths();
    if (this._editableHandles.size) {
      this._removeEditableLocations();
      this._drawEditableLocations();
    }
  }

  private get _darkMode() {
    return (
      this.themeMode === "dark" ||
      (this.themeMode === "auto" && Boolean(this._ui?.themes?.darkMode))
    );
  }

  // Memoized: it is read on every appearance sync, and the engines compare
  // what they are handed against what they applied.
  private _resolveMapStyle = memoizeOne(resolveMapStyle);

  // Read from the live stylesheet, so it is only re-read when the theme could
  // have changed - which is exactly when _updateMapAppearance runs.
  private _themeColors?: Record<string, string>;

  // Kept by identity, not just by value: _resolveMapStyle memoizes on its
  // arguments, and a fresh object per read would defeat it.
  private _readThemeColors(): void {
    // Only one set of --ha-color-map-* is live on the page, the one for the
    // mode the page is in. A card forced to the other mode draws the other
    // palette, so those values would be the wrong half of the theme; the
    // style's own colors are the better answer there.
    const pageDark = Boolean(this._ui?.themes?.darkMode);
    const colors =
      this._darkMode === pageDark ? readMapThemeColors(this) : undefined;
    if (!deepEqual(colors, this._themeColors)) {
      this._themeColors = colors;
    }
  }

  private get _resolvedMapStyle() {
    return this._resolveMapStyle(
      this.mapStyle,
      this._darkMode,
      this._themeColors
    );
  }

  private _updateMapAppearance(): void {
    // A theme repaints the map by setting --ha-color-map-* on this element;
    // WebGL cannot read those, so they are collected here and rebuilt into
    // the style. Undefined when the theme says nothing, which is the common
    // case and keeps the map on the style the build generated.
    this._readThemeColors();

    const map = this._mapElement;
    if (!map) {
      return;
    }
    map.classList.toggle("clickable", this.clickable);
    map.classList.toggle("dark", this._darkMode);
    map.classList.toggle("drawn", this._mapDrawn);
    // The sky belongs behind a drawn globe; on a blank canvas it is just a
    // gradient with a glow in it
    map.classList.toggle("space", this._vectorEngine && this._mapDrawn);
    map.classList.toggle("forced-dark", this.themeMode === "dark");
    map.classList.toggle("forced-light", this.themeMode === "light");
    this._engine?.setMapStyle(this._resolvedMapStyle);
  }

  private _mapDrawn = false;

  private _drawnFallback?: number;

  private _markDrawn(attempt: number): void {
    if (attempt !== this._setupAttempt || this._mapDrawn) {
      return;
    }
    clearTimeout(this._drawnFallback);
    this._mapDrawn = true;
    this._updateMapAppearance();
  }

  private _loading = false;

  private _forceLeaflet = false;

  // The engine being set up, so a disconnect can tear it down mid-init
  private _startingEngine?: MapEngine;

  private _setupAttempt = 0;

  /** Whether the next engine is the vector one: only it draws a globe */
  private get _vectorEngine(): boolean {
    return !this._forceLeaflet && supportsVectorMaps();
  }

  // Each engine is its own chunk; a map only downloads the one it uses
  private async _createEngine(): Promise<MapEngine> {
    if (!this._vectorEngine) {
      const leaflet =
        await import("../../common/map/engines/leaflet-map-engine");
      return new leaflet.LeafletMapEngine();
    }
    const maplibre =
      await import("../../common/map/engines/maplibre-map-engine");
    return new maplibre.MapLibreMapEngine();
  }

  // An engine that cannot start hands over to the Leaflet fallback
  private async _loadMap(): Promise<void> {
    const onFallback = this._forceLeaflet || !supportsVectorMaps();
    try {
      await this._setUpEngine();
    } catch (err) {
      if (!this.isConnected) {
        return;
      }
      if (onFallback) {
        // Already on the fallback; nothing left to try
        throw err;
      }
      this._forceLeaflet = true;
      await this._loadMap();
    }
  }

  private async _setUpEngine(): Promise<void> {
    if (this._loading) return;
    // A fresh container per engine; engines leave state on the element they used
    this.shadowRoot!.getElementById("map")?.remove();
    const map = document.createElement("div");
    map.id = "map";
    // Which ground shows in the gap before the first frame; the rest of the
    // classes wait for the engine (_updateMapAppearance)
    map.classList.toggle("dark", this._darkMode);
    this.shadowRoot!.append(map);
    this._loading = true;
    this._mapDrawn = false;
    clearTimeout(this._drawnFallback);
    const attempt = ++this._setupAttempt;
    let engine: MapEngine | undefined;
    try {
      // Without a connection or the tile proxy the map sets up without tiles
      const token = this._connection
        ? await ensureMapTilesToken(this._connection.connection)
        : undefined;

      // Before init, or the first style the engine builds is the unthemed one.
      this._readThemeColors();

      const rasterOnly = this._forceLeaflet;
      engine = await this._createEngine();
      if (attempt !== this._setupAttempt) {
        return;
      }
      this._startingEngine = engine;
      // Started here so the budget covers an engine that never reports a
      // frame, not the token and the chunk it waited for
      this._drawnFallback = window.setTimeout(
        () => this._markDrawn(attempt),
        DRAWN_FALLBACK
      );
      await engine.init(map, {
        center: [
          this._config?.latitude ?? 52.3731339,
          this._config?.longitude ?? 4.8903147,
        ],
        zoom: this.zoom,
        mapStyle: this._resolvedMapStyle,
        token,
        rasterOnly: this._forceLeaflet,
        zoomControlPosition: this.zoomPosition,
        events: {
          click: (location) => this._handleEngineClick(location),
          zoomStart: () => {
            if (!this._isProgrammaticFit) {
              this._pauseAutoFit = true;
            }
          },
          moveStart: () => {
            if (!this._isProgrammaticFit) {
              this._pauseAutoFit = true;
            }
          },
          fatal: () => this._handleEngineFatal(),
          drawn: () => this._markDrawn(attempt),
        },
      });
      // Disconnected while the style was loading, or superseded by a newer setup
      if (!this.isConnected || attempt !== this._setupAttempt) {
        return;
      }
      // A fatal event during setup asked for the fallback; _loadMap retries on it
      if (this._forceLeaflet && !rasterOnly) {
        throw new Error("Map engine failed during setup");
      }
      this._engine = engine;
      this._updateMapAppearance();
      this._loaded = true;
      fireEvent(this, "editing-available-changed", {
        available: !!engine.editing,
      });
    } finally {
      if (attempt === this._setupAttempt) {
        this._loading = false;
        this._startingEngine = undefined;
      }
      // An engine that did not make it may already hold a map and a WebGL context
      if (engine && engine !== this._engine) {
        engine.destroy();
      }
    }
  }

  // Rebuild on the Leaflet fallback after a fatal engine failure
  private _handleEngineFatal(): void {
    if (this._forceLeaflet) {
      return;
    }
    this._forceLeaflet = true;
    if (this._loading) {
      // Setup in flight: tearing its engine down settles a pending init, and
      // the setup then hands over to the fallback
      this._startingEngine?.destroy();
      return;
    }
    this._engine?.destroy();
    this._engine = undefined;
    this._entityHandles = [];
    this._zoneHandles = [];
    this._zoneCircleHandles = [];
    this._pathHandles = [];
    this._removeEditableLocations();
    this._focusPoints = [];
    this._focusZonePoints = [];
    this._pendingFit = undefined;
    this._hasFitted = false;
    this._loaded = false;
    this._loadMap();
  }

  private _handleEngineClick(location: MapLatLng): void {
    // Fire only for single clicks, not for the two of a double-click zoom
    if (this._clickCount === 0) {
      setTimeout(() => {
        if (this._clickCount === 1) {
          fireEvent(this, "map-clicked", { location });
        }
        this._clickCount = 0;
      }, 250);
    }
    this._clickCount++;
  }

  // The first fit after load jumps to the content; later fits animate
  private _hasFitted = false;

  private _withProgrammaticFit(fit: () => void): void {
    this._isProgrammaticFit = true;
    fit();
    setTimeout(() => {
      this._isProgrammaticFit = false;
    }, PROGRAMMITIC_FIT_DELAY);
  }

  public fitMap(options?: {
    zoom?: number;
    pad?: number;
    padding?: MapFitPadding;
    unpause_autofit?: boolean;
  }): void {
    if (options?.unpause_autofit) {
      this._pauseAutoFit = false;
    }
    if (!this._engine || !this._config) {
      return;
    }

    if (this._deferIfUnsized(() => this.fitMap(options))) {
      return;
    }

    // Zones join the fit when asked, or when they are all there is
    const zonePoints =
      this.fitZones || !this._focusPoints.length ? this._focusZonePoints : [];
    if (
      !this._focusPoints.length &&
      !zonePoints.length &&
      !this.editableLocations?.length
    ) {
      this._withProgrammaticFit(() => {
        this._engine!.setView(
          [this._config.latitude, this._config.longitude],
          options?.zoom || this.zoom
        );
      });
      this._hasFitted = true;
      return;
    }

    const points = [...this._focusPoints, ...zonePoints];

    // Opted-out locations only count when nothing else would be fitted
    const editables = this.editableLocations ?? [];
    const fitted = editables.filter((editable) => editable.fit !== false);
    (fitted.length ? fitted : editables).forEach((editable) => {
      if (editable.radius) {
        points.push(...circleBoundsPoints(editable.location, editable.radius));
      } else {
        points.push(editable.location);
      }
    });

    this._withProgrammaticFit(() => {
      this._engine!.fitBounds(points, {
        maxZoom: options?.zoom || this.zoom,
        pad: options?.pad ?? 0.5,
        padding: options?.padding ?? this.fitPadding,
        animate: this._hasFitted,
      });
    });
    this._hasFitted = true;
  }

  // Fitting uses the container size; before layout it is 0x0 and the zoom
  // collapses to the minimum, so defer until the resize observer reports one
  private _deferIfUnsized(fit: () => void): boolean {
    if (this._engine!.hasUsableSize()) {
      this._pendingFit = undefined;
      return false;
    }
    this._pendingFit = fit;
    return true;
  }

  private _runPendingFit(): void {
    if (!this._pendingFit || !this._engine) {
      return;
    }
    if (this._engine.hasUsableSize()) {
      const pendingFit = this._pendingFit;
      this._pendingFit = undefined;
      pendingFit();
    }
  }

  public panTo(location: MapLatLng): void {
    this._engine?.panTo(location);
  }

  public containsLocation(location: MapLatLng): boolean {
    return this._engine?.containsLocation(location) ?? false;
  }

  public setView(center: MapLatLng, zoom?: number): void {
    if (!this._engine) {
      this._pendingFit = () => this.setView(center, zoom);
      return;
    }
    this._pendingFit = undefined;
    this._engine.setView(center, zoom);
  }

  public getView(): MapView | undefined {
    return this._engine?.getView();
  }

  public fitBounds(
    boundingbox: MapLatLng[],
    options?: {
      zoom?: number;
      pad?: number;
      padding?: MapFitPadding;
      fly?: boolean;
    }
  ) {
    // An explicit fit is user intent, even while it waits for the engine or
    // a size; an auto-fit must not take its place in the meantime
    this._pauseAutoFit = true;
    if (!this._engine) {
      // Engine still loading (see _loadMap); runs once it is
      this._pendingFit = () => this.fitBounds(boundingbox, options);
      return;
    }
    if (this._deferIfUnsized(() => this.fitBounds(boundingbox, options))) {
      return;
    }
    this._withProgrammaticFit(() => {
      this._engine!.fitBounds(boundingbox, {
        maxZoom: options?.zoom || this.zoom,
        pad: options?.pad ?? 0.5,
        animate: this._hasFitted,
        padding: options?.padding,
        fly: options?.fly,
      });
    });
    this._hasFitted = true;
  }

  // Returns whether locations were added or removed
  private _drawEditableLocations(): boolean {
    const engine = this._engine;
    if (!engine) {
      return false;
    }
    const staticSupport = staticEditing(engine);
    const editing = engine.editing ?? staticSupport;
    const wanted = new Set((this.editableLocations ?? []).map((e) => e.id));
    let changed = false;
    for (const [id, entry] of this._editableHandles) {
      if (!wanted.has(id)) {
        entry.cleanup?.();
        entry.handle.remove();
        this._editableHandles.delete(id);
        changed = true;
      }
    }
    if (!this.editableLocations) {
      return changed;
    }
    const defaultColor =
      getComputedStyle(this).getPropertyValue("--accent-color");
    for (const editable of this.editableLocations) {
      const { id } = editable;
      // Markers are buttons, so an unnamed location still gets a name
      const title =
        editable.title ?? this._i18n?.localize("ui.components.map.location");
      const tooltip = !!editable.element && !!editable.title;
      const existing = this._editableHandles.get(id);
      const kind = editable.radius ? "circle" : "marker";

      if (
        existing &&
        existing.kind === kind &&
        sameAppearance(existing.source, editable)
      ) {
        if (existing.kind === "circle") {
          existing.handle.update(editable.location, editable.radius!);
        } else {
          existing.handle.setLocation(editable.location);
        }
        existing.source = editable;
        continue;
      }
      if (existing) {
        existing.cleanup?.();
        existing.handle.remove();
      } else {
        changed = true;
      }

      if (kind === "circle") {
        const handle = editing.addEditableCircle(editable.location, {
          radius: editable.radius!,
          color: editable.color || defaultColor,
          centerElement: editable.element,
          centerSize: editable.elementSize,
          title,
          nativeTitle: !tooltip,
          moveable: editable.locationEditable,
          resizable: editable.radiusEditable,
          resizeLabel: editable.title
            ? this._i18n?.localize("ui.components.map.radius_of", {
                name: editable.title,
              })
            : this._i18n?.localize("ui.components.map.radius"),
          onMove: (location) =>
            fireEvent(this, "editable-location-moved", { id, location }),
          onResize: (radius) =>
            fireEvent(this, "editable-location-resized", { id, radius }),
          onClick: editable.activatable
            ? () => fireEvent(this, "editable-location-clicked", { id })
            : undefined,
        });
        this._editableHandles.set(id, {
          kind,
          source: editable,
          handle,
          cleanup: tooltip
            ? this._attachTooltip(editable.element!, editable.title!)
            : undefined,
        });
        continue;
      }
      const element = editable.element ?? document.createElement("div");
      if (!editable.element) {
        element.className = "editable-circle-center";
      }
      let dragged = false;
      let cleanup: (() => void) | undefined;
      if (editable.activatable) {
        // A drag can end in a click; only one with its own pointer down counts
        const onPointerDown = () => {
          dragged = false;
        };
        const onClick = (ev: Event) => {
          ev.stopPropagation();
          if (dragged) {
            return;
          }
          fireEvent(this, "editable-location-clicked", { id });
        };
        const onKeydown = (ev: KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            fireEvent(this, "editable-location-clicked", { id });
          }
        };
        element.addEventListener("pointerdown", onPointerDown);
        element.addEventListener("click", onClick);
        element.addEventListener("keydown", onKeydown);
        cleanup = () => {
          element.removeEventListener("pointerdown", onPointerDown);
          element.removeEventListener("click", onClick);
          element.removeEventListener("keydown", onKeydown);
        };
      }
      // A location that cannot be dragged is static on any engine
      const support = editable.locationEditable ? editing : staticSupport;
      const handle = support.addDraggableMarker(element, editable.location, {
        size: editable.elementSize ?? [16, 16],
        interactive: true,
        focusable: !!editable.activatable,
        title,
        nativeTitle: !tooltip,
        onDragEnd: (location) => {
          dragged = true;
          fireEvent(this, "editable-location-moved", { id, location });
        },
      });
      const removeTooltip = tooltip
        ? this._attachTooltip(editable.element!, editable.title!)
        : undefined;
      this._editableHandles.set(id, {
        kind,
        source: editable,
        cleanup: () => {
          cleanup?.();
          removeTooltip?.();
        },
        handle,
      });
    }
    return changed;
  }

  private _attachTooltip(element: HTMLElement, title: string): () => void {
    element.id ||= `ha-map-editable-${this._tooltipCount++}`;
    const tooltip = document.createElement("ha-tooltip");
    tooltip.for = element.id;
    tooltip.textContent = title;
    this.shadowRoot!.append(tooltip);
    return () => tooltip.remove();
  }

  // One by one, so the listeners on the caller's elements are detached too
  private _removeEditableLocations(): void {
    for (const entry of this._editableHandles.values()) {
      entry.cleanup?.();
      entry.handle.remove();
    }
    this._editableHandles.clear();
  }

  private _computePathTooltip(path: HaMapPaths, point: HaMapPathPoint): string {
    let formattedTime: string;
    if (path.fullDatetime) {
      formattedTime = formatDateTime(
        point.timestamp,
        this._i18n.locale,
        this._config
      );
    } else if (isToday(point.timestamp)) {
      formattedTime = formatTimeWithSeconds(
        point.timestamp,
        this._i18n.locale,
        this._config
      );
    } else {
      formattedTime = formatTimeWeekday(
        point.timestamp,
        this._i18n.locale,
        this._config
      );
    }
    return `${filterXSS(path.name ?? "")}<br>${formattedTime}`;
  }

  private _drawPaths(): void {
    if (!this._i18n || !this._config || !this._engine) {
      return;
    }
    const paths = this.paths ?? [];
    this._pathHandles.splice(paths.length).forEach((handle) => handle.remove());
    if (!paths.length) {
      return;
    }

    const darkPrimaryColor = getComputedStyle(this).getPropertyValue(
      "--dark-primary-color"
    );

    paths.forEach((path, index) => {
      let opacityStep: number;
      let baseOpacity: number;
      if (path.gradualOpacity) {
        opacityStep = path.gradualOpacity / (path.points.length - 2);
        baseOpacity = 1 - path.gradualOpacity;
      }

      const segments: MapPathSegment[] = [];
      const markers: MapPathMarker[] = [];

      for (
        let pointIndex = 0;
        pointIndex < path.points.length - 1;
        pointIndex++
      ) {
        const opacity = path.gradualOpacity
          ? baseOpacity! + pointIndex * opacityStep!
          : undefined;

        const thisPoint = path.points[pointIndex];
        const nextPoint = path.points[pointIndex + 1];

        markers.push({
          location: thisPoint.point,
          opacity,
          tooltipHtml: this._computePathTooltip(path, thisPoint),
        });

        if (Math.abs(thisPoint.point[1] - nextPoint.point[1]) <= 180) {
          // if the path does not cross the antimeridian, draw a simple line
          // between the two points
          segments.push({
            points: [thisPoint.point, nextPoint.point],
            opacity,
          });
        } else {
          // if the path crosses the antimeridian, split the line into two, to
          // avoid it being drawn across the entire map
          const longitudeDifference =
            ((nextPoint.point[1] - thisPoint.point[1] + 540) % 360) - 180;
          let intersectionLatitude: number;
          if (longitudeDifference === 0) {
            // very, very unlikely edge case
            intersectionLatitude =
              (thisPoint.point[0] + nextPoint.point[0]) / 2;
          } else {
            intersectionLatitude =
              thisPoint.point[0] +
              ((nextPoint.point[0] - thisPoint.point[0]) *
                (thisPoint.point[1] > 0
                  ? 180 - thisPoint.point[1]
                  : -180 - thisPoint.point[1])) /
                longitudeDifference;
          }

          const intersectionPoint1: MapLatLng = [
            intersectionLatitude,
            thisPoint.point[1] > 0 ? 180 : -180,
          ];
          const intersectionPoint2: MapLatLng = [
            intersectionLatitude,
            nextPoint.point[1] > 0 ? 180 : -180,
          ];

          segments.push({
            points: [thisPoint.point, intersectionPoint1],
            opacity,
          });
          segments.push({
            points: [intersectionPoint2, nextPoint.point],
            opacity,
          });
        }
      }
      const pointIndex = path.points.length - 1;
      if (pointIndex >= 0) {
        const opacity = path.gradualOpacity
          ? baseOpacity! + pointIndex * opacityStep!
          : undefined;
        markers.push({
          location: path.points[pointIndex].point,
          opacity,
          tooltipHtml: this._computePathTooltip(path, path.points[pointIndex]),
        });
      }

      const enginePath: MapPath = {
        color: path.color || darkPrimaryColor,
        segments,
        markers,
      };
      const handle = this._pathHandles[index];
      if (handle) {
        handle.update(enginePath);
      } else {
        this._pathHandles.push(this._engine!.addPath(enginePath));
      }
    });
  }

  private _drawEntities(): void {
    const states = this._states;
    const engine = this._engine;

    if (!states || !engine) {
      return;
    }

    this._entityHandles.forEach((handle) => handle.remove());
    this._entityHandles = [];
    this._focusPoints = [];

    this._zoneHandles.forEach((handle) => handle.remove());
    this._zoneHandles = [];
    this._focusZonePoints = [];
    let zoneCircleCount = 0;

    if (!this.entities) {
      this._zoneCircleHandles.splice(0).forEach((handle) => handle.remove());
      this._entityMarkers.clear();
      this._clusterAvatars.clear();
      engine.setClustering(null);
      return;
    }
    this._watchRegistry();

    const computedStyles = getComputedStyle(this);
    // A person's state is "home" for the home zone, the zone name otherwise
    const zoneByState: Record<string, string> = {};
    this._zonePositions = {};
    this._zoneRadii = {};
    for (const entity of this.entities) {
      const stateObj = states[getEntityId(entity)];
      // A zone that is not drawn cannot anchor a bubble either
      if (
        stateObj &&
        computeStateDomain(stateObj) === "zone" &&
        (this.renderPassive || !stateObj.attributes.passive)
      ) {
        zoneByState[
          stateObj.entity_id === "zone.home"
            ? "home"
            : computeStateName(stateObj)
        ] = stateObj.entity_id;
        if (
          typeof stateObj.attributes.latitude === "number" &&
          typeof stateObj.attributes.longitude === "number"
        ) {
          this._zonePositions[stateObj.entity_id] = [
            stateObj.attributes.latitude,
            stateObj.attributes.longitude,
          ];
          if (typeof stateObj.attributes.radius === "number") {
            this._zoneRadii[stateObj.entity_id] = stateObj.attributes.radius;
          }
        }
      }
    }

    const drawn = new Set<string>();
    for (const entity of this.entities) {
      const stateObj = states[getEntityId(entity)];
      if (!stateObj) {
        continue;
      }
      const customTitle = typeof entity !== "string" ? entity.name : undefined;
      const title = customTitle ?? computeStateName(stateObj);
      const {
        passive,
        icon,
        radius,
        entity_picture: entityPicture,
      } = stateObj.attributes;

      const location = getEntityLocation(stateObj, states);
      if (!location) {
        continue;
      }
      const { latitude, longitude, gpsAccuracy } = location;
      const position: MapLatLng = [latitude, longitude];

      if (computeStateDomain(stateObj) === "zone") {
        // DRAW ZONE
        if (passive && !this.renderPassive) {
          continue;
        }

        const hideRadius = typeof entity !== "string" && entity.hide_radius;
        // A host-set color wins, except passive zones are always muted
        const markerColor =
          !passive && typeof entity !== "string" && entity.color
            ? entity.color
            : zoneColor(
                stateObj.entity_id,
                !!passive,
                this._entityReg,
                computedStyles
              );

        if (!hideRadius && radius) {
          const circleOptions = { radius, color: markerColor };
          const circle = this._zoneCircleHandles[zoneCircleCount];
          if (circle) {
            circle.update(position, circleOptions);
          } else {
            this._zoneCircleHandles.push(
              engine.addCircle(position, circleOptions)
            );
          }
          zoneCircleCount++;
        }

        const circleEl = createZoneMarkerElement({
          color: markerColor,
          icon,
          name: title,
        });

        if (this.interactiveZones) {
          const openMoreInfo = (ev: Event) => {
            ev.stopPropagation();
            fireEvent(this, "hass-more-info", {
              entityId: stateObj.entity_id,
            });
          };
          circleEl.addEventListener("click", openMoreInfo);
          circleEl.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              openMoreInfo(ev);
            }
          });
        }

        this._zoneHandles.push(
          engine.addMarker(circleEl, position, {
            size: [ZONE_CIRCLE_SIZE, ZONE_CIRCLE_SIZE],
            interactive: this.interactiveZones,
            title,
          })
        );

        if (typeof entity === "string" || entity.focus !== false) {
          if (!hideRadius && radius) {
            this._focusZonePoints.push(...circleBoundsPoints(position, radius));
          } else {
            this._focusZonePoints.push(position);
          }
        }

        continue;
      }

      // DRAW ENTITY
      // create icon
      const entityName =
        typeof entity !== "string" && entity.label_mode === "state"
          ? this._formatters.formatEntityState(stateObj)
          : typeof entity !== "string" &&
              entity.label_mode === "attribute" &&
              entity.attribute !== undefined
            ? this._formatters.formatEntityAttributeValue(
                stateObj,
                entity.attribute
              )
            : (customTitle ??
              title
                .split(" ")
                .map((part) => part[0])
                .join("")
                .substr(0, 3));

      const entityId = getEntityId(entity);
      const entityMarker = takeEntityMarker(
        this._entityMarkers,
        entityId,
        !drawn.has(entityId)
      );
      drawn.add(entityId);
      entityMarker.showIcon =
        typeof entity !== "string" && entity.label_mode === "icon";
      entityMarker.entityId = entityId;
      entityMarker.entityName = entityName;
      entityMarker.entityUnit =
        typeof entity !== "string" &&
        entity.unit &&
        entity.label_mode === "attribute"
          ? entity.unit
          : "";
      entityMarker.entityPicture =
        entityPicture && (typeof entity === "string" || !entity.label_mode)
          ? this._connection.hassUrl(entityPicture)
          : "";
      // A host may leave the color to the map
      const entityColor =
        (typeof entity !== "string" ? entity.color : undefined) ||
        entityMapColor(entityId, this._entityReg, computedStyles);
      entityMarker.entityColor = entityColor;
      entityMarker.selected =
        typeof entity !== "string" && (entity.selected ?? false);
      entityMarker.floating = true;

      const clusterData: ClusterData = {
        entityId,
        title,
        picture: entityMarker.entityPicture || undefined,
        label: entityName,
        showIcon: entityMarker.showIcon,
        unit: entityMarker.entityUnit ?? "",
        color: entityColor,
        selected: entityMarker.selected,
        zoneId: ["person", "device_tracker"].includes(
          computeStateDomain(stateObj)
        )
          ? (zoneByState[stateObj.state] ?? this._zoneContaining(position))
          : undefined,
      };

      const accuracy =
        gpsAccuracy || (entityMarker.selected ? NOMINAL_ACCURACY : 0);
      const showAccuracy =
        accuracy > 0 && !(typeof entity !== "string" && entity.hide_accuracy);

      this._entityHandles.push(
        engine.addMarker(entityMarker, position, {
          ...floatingMarkerFootprint(
            this._getMarkerSize(computedStyles),
            entityMarker.selected
          ),
          title,
          // Selected, it leaves its bubble
          cluster: !entityMarker.selected,
          raised: entityMarker.selected,
          clusterData,
          decoration: showAccuracy
            ? {
                radius: accuracy,
                color: entityColor,
                outline: accuracy > PRECISE_GPS_ACCURACY,
              }
            : undefined,
        })
      );

      if (typeof entity === "string" || entity.focus !== false) {
        this._focusPoints.push(position);
      }
    }

    this._zoneCircleHandles
      .splice(zoneCircleCount)
      .forEach((handle) => handle.remove());

    const shownIds = new Set(this.entities.map(getEntityId));
    for (const cache of [this._entityMarkers, this._clusterAvatars]) {
      for (const entityId of cache.keys()) {
        if (!shownIds.has(entityId)) {
          cache.delete(entityId);
        }
      }
    }

    engine.setClustering(
      this.clusterMarkers
        ? {
            radius: CLUSTER_RADIUS,
            iconBuilder: this._createClusterBubble,
            // Everyone in a zone shares its bubble until zooming spreads them
            groupKey: (marker) => (marker.clusterData as ClusterData)?.zoneId,
            groupRadius: ZONE_GROUP_RADIUS,
          }
        : null
    );
  }

  private _zoneContaining(position: MapLatLng): string | undefined {
    let found: string | undefined;
    let foundRadius = Infinity;
    for (const [zoneId, radius] of Object.entries(this._zoneRadii)) {
      if (
        radius < foundRadius &&
        distanceMeters(position, this._zonePositions[zoneId]) <= radius
      ) {
        found = zoneId;
        foundRadius = radius;
      }
    }
    return found;
  }

  // Renders a marker cluster as a bubble of its members' avatars
  private _createClusterBubble = (
    members: MapMarkerHandle[],
    _location: MapLatLng,
    zoneId?: string,
    expanded = false
  ): MapClusterIcon => {
    const data = members.map((member) => member.clusterData as ClusterData);
    const shown =
      expanded || data.length <= CLUSTER_MAX_AVATARS
        ? data
        : data.slice(0, CLUSTER_MAX_AVATARS - 1);
    const hidden = data.length - shown.length;

    // With history trails shown, colored borders match avatars to trails
    const showColors = !!this.paths?.length;

    const bubble = document.createElement("div");
    bubble.className = "cluster-bubble";
    const seen = new Set<string>();
    for (const member of shown) {
      const avatar = takeEntityMarker(
        this._clusterAvatars,
        member?.entityId,
        !seen.has(member?.entityId ?? "")
      );
      if (member?.entityId) {
        seen.add(member.entityId);
      }
      avatar.entityId = member?.entityId;
      avatar.entityName = member?.label ?? "";
      avatar.entityUnit = member?.unit ?? "";
      avatar.showIcon = member?.showIcon ?? false;
      avatar.entityPicture = member?.picture ?? "";
      avatar.entityColor = member?.color;
      if (showColors) {
        avatar.style.setProperty(
          "--ha-marker-color",
          member?.color ?? "var(--primary-color)"
        );
        avatar.style.setProperty("--ha-marker-border-width", "2px");
      } else {
        avatar.style.removeProperty("--ha-marker-color");
        avatar.style.removeProperty("--ha-marker-border-width");
      }
      avatar.selected = member?.selected ?? false;
      // In an expanded bubble each avatar is reachable on its own
      clearMarkerAccessibility(avatar);
      if (expanded) {
        setMarkerAccessibility(avatar, member?.title, true);
      }
      bubble.appendChild(avatar);
    }

    // An expanded bubble wraps once a row would not fit the map
    const perRow = expanded
      ? Math.max(
          1,
          Math.floor(
            (this.offsetWidth -
              2 * CLUSTER_BUBBLE_MARGIN -
              2 * CLUSTER_BUBBLE_PADDING +
              CLUSTER_BUBBLE_GAP) /
              (CLUSTER_AVATAR_SIZE + CLUSTER_BUBBLE_GAP)
          )
        )
      : shown.length;
    const columns = Math.min(shown.length, perRow);
    const rows = Math.ceil(shown.length / perRow);
    let width =
      columns * CLUSTER_AVATAR_SIZE +
      (columns - 1) * CLUSTER_BUBBLE_GAP +
      2 * CLUSTER_BUBBLE_PADDING;
    if (hidden > 0) {
      const more = document.createElement("span");
      more.className = "more";
      more.textContent =
        hidden > CLUSTER_MORE_MAX ? `${CLUSTER_MORE_MAX}+` : `+${hidden}`;
      bubble.appendChild(more);
      width += CLUSTER_MORE_WIDTH + CLUSTER_BUBBLE_GAP;
    }

    const height =
      rows * CLUSTER_AVATAR_SIZE +
      (rows - 1) * CLUSTER_BUBBLE_GAP +
      2 * CLUSTER_BUBBLE_PADDING +
      CLUSTER_TAIL_HEIGHT;
    const root = document.createElement("div");
    root.className = "cluster-marker";
    const tail = document.createElement("div");
    tail.className = "cluster-bubble-tail";
    root.append(bubble, tail);

    // A cluster of one zone's occupants floats above that zone's circle
    const zonePosition = zoneId ? this._zonePositions[zoneId] : undefined;
    return {
      element: root,
      size: [width, height],
      location: zonePosition,
      anchor: [
        width / 2,
        height +
          (zonePosition
            ? ZONE_CIRCLE_SIZE / 2 + CLUSTER_ZONE_SPACING
            : FLOATING_LIFT),
      ],
    };
  };

  private _drawScaleRuler(): void {
    this._engine?.setScaleRuler(
      this.scaleRuler
        ? { metric: this._config?.unit_system?.length === UNIT_KM }
        : null
    );
  }

  private _getMarkerSize(computedStyles: CSSStyleDeclaration): number {
    const markerSizeVarValue =
      computedStyles.getPropertyValue("--ha-marker-size");
    const parsed = parseFloat(markerSizeVarValue);
    return Number.isNaN(parsed) ? 48 : parsed;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this._engine?.invalidateSize();
        this._runPendingFit();
      });
    }
    this._resizeObserver.observe(this);
  }

  static styles = css`
    :host {
      display: block;
      height: 300px;
    }
    #map {
      height: 100%;
      /* The map arrives in one piece: the container carries the cartography's
         own ground, and fades in with the markers once a frame is drawn */
      background-color: #f4efe6;
      /* Hidden rather than transparent: the controls and markers in here are
         not to be clicked or tabbed to before they are on screen */
      visibility: hidden;
      opacity: 0;
      transition: opacity var(--ha-animation-duration-fast, 150ms) ease-in;
      /* A cluster bubble and its tail cast a single shadow around their
         combined silhouette (drop-shadow on the wrapper), so no shadow seam
         appears between the bubble and its tail. */
      --ha-cluster-shadow: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08))
        drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12));
    }
    #map.drawn {
      visibility: visible;
      opacity: 1;
    }
    #map.clickable {
      cursor: pointer;
    }
    .maplibregl-marker {
      transition:
        opacity var(--ha-animation-duration-fast),
        visibility var(--ha-animation-duration-fast);
    }
    .maplibregl-marker-covered {
      visibility: hidden;
      pointer-events: none;
    }
    /* A zone fades in once the bubble over it is opaque, not through it */
    .zone-circle:not(.maplibregl-marker-covered) {
      transition-delay: var(--ha-animation-duration-fast);
    }
    #map.dark {
      background: #191b2c;
      --ha-cluster-shadow: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4))
        drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
    }
    #map.forced-dark {
      color: #ffffff;
      --map-filter: invert(0.9) hue-rotate(170deg) brightness(1.5) contrast(1.2)
        saturate(0.3);
    }
    #map.forced-light {
      background: #ffffff;
      color: #000000;
      --map-filter: invert(0);
    }
    /* Zoomed out the sky fades out and the globe is left on a transparent
       canvas, so what surrounds it is this element. The same sky in both
       themes, day or night: a glow where the sphere sits at the widest zoom
       out -- MapLibre's own atmosphere carries the edge from there in -- over
       a gradient that lightens towards the top. */
    #map.space {
      --ha-map-space-glow: rgba(255, 255, 255, 0.95);
      --ha-map-space-haze: rgba(255, 255, 255, 0.45);
      --ha-map-space-fade: rgba(255, 255, 255, 0);
      --ha-map-space-high: #dbe8f8;
      --ha-map-space-low: #7aa5d3;
      background-color: var(--ha-map-space-low);
      background-image:
        radial-gradient(
          circle at 50% 50%,
          var(--ha-map-space-glow) 18%,
          var(--ha-map-space-haze) 24%,
          var(--ha-map-space-fade) 34%
        ),
        linear-gradient(
          180deg,
          var(--ha-map-space-high) 0%,
          var(--ha-map-space-low) 100%
        );
      background-repeat: no-repeat;
    }
    #map.space.dark {
      --ha-map-space-glow: rgba(126, 158, 224, 0.5);
      --ha-map-space-haze: rgba(86, 110, 170, 0.22);
      --ha-map-space-fade: rgba(86, 110, 170, 0);
      --ha-map-space-high: #141a30;
      --ha-map-space-low: #05060f;
    }
    #map.clickable:active,
    #map:active {
      cursor: grabbing;
    }
    /* The tail is a rotated square whose upper half sits under the bubble;
       drawn behind it, so it never covers an avatar's frame or selected ring */
    .cluster-bubble-tail {
      position: relative;
      z-index: -1;
    }
    /* Only the raster fallback is inverted for dark mode, the vector style
       ships its own dark cartography. */
    .leaflet-tile-pane .leaflet-tile {
      filter: var(--map-filter);
    }
    /* The Leaflet fallback with WebGL2 renders vectors through the adapter
       without MapLibre's stylesheet; these are the only two rules its canvas
       needs. */
    .maplibregl-map {
      position: relative;
      overflow: hidden;
    }
    .maplibregl-canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
    .maplibregl-ctrl-bottom-left,
    .maplibregl-ctrl-bottom-right {
      /* Lets a card keep the attribution and scale clear of an overlay */
      margin-bottom: var(--ha-map-bottom-inset, 0);
    }
    .maplibregl-ctrl-top-left,
    .maplibregl-ctrl-bottom-left {
      margin-left: var(--ha-map-left-inset, 0);
    }
    .maplibregl-ctrl-top-right,
    .maplibregl-ctrl-bottom-right {
      margin-right: var(--ha-map-right-inset, 0);
    }
    .dark .maplibregl-ctrl.maplibregl-ctrl-group {
      background-color: #1c1c1c;
    }
    .dark .maplibregl-ctrl-group button + button {
      border-top-color: #313131;
    }
    .dark .maplibregl-ctrl button .maplibregl-ctrl-icon {
      filter: invert(1);
    }
    /* Not inherited from the page, which may be in the other mode */
    .maplibregl-ctrl.maplibregl-ctrl-attrib {
      color: #000000;
    }
    .dark .maplibregl-ctrl.maplibregl-ctrl-attrib {
      background-color: rgba(28, 28, 28, 0.6);
      color: #ffffff;
    }
    .dark .maplibregl-ctrl-attrib.maplibregl-compact {
      background-color: #1c1c1c;
    }
    .dark .maplibregl-ctrl-attrib a {
      color: rgba(255, 255, 255, 0.85);
    }
    .dark .maplibregl-ctrl-attrib-button {
      filter: invert(1);
    }
    /* MapLibre's stylesheet, linked into this root, wins on equal specificity */
    .maplibregl-popup-content {
      padding: 8px !important;
      font-size: var(--ha-font-size-s);
      font-family: var(--ha-font-family-body);
      background: rgba(80, 80, 80, 0.9) !important;
      color: white !important;
      border-radius: var(--ha-border-radius-sm) !important;
      box-shadow: none !important;
      text-align: center;
    }
    .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
      border-top-color: rgba(80, 80, 80, 0.9) !important;
    }
    .maplibregl-popup-anchor-top .maplibregl-popup-tip {
      border-bottom-color: rgba(80, 80, 80, 0.9) !important;
    }
    .maplibregl-ctrl-bottom-left {
      direction: ltr;
    }
    .dark .leaflet-bar a {
      background-color: #1c1c1c;
      color: #ffffff;
    }
    .dark .leaflet-bar a:hover {
      background-color: #313131;
    }
    ${unsafeCSS(editableCircleStyles)}
    .named-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      text-align: center;
      color: var(--primary-text-color);
    }
    .leaflet-pane {
      z-index: 0 !important;
    }
    .cluster-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      isolation: isolate;
      filter: var(--ha-cluster-shadow);
    }
    /* The wrapper carries the shadow around the bubble-plus-tail outline, so
       the bubble itself drops its own to avoid a seam at the tail. */
    .cluster-marker .cluster-bubble {
      filter: none;
    }
    .cluster-bubble-tail {
      width: ${CLUSTER_TAIL_SIZE}px;
      height: ${CLUSTER_TAIL_SIZE}px;
      margin-top: ${-CLUSTER_TAIL_SIZE / 2}px;
      border-radius: 2px;
      background: var(--card-background-color, #fff);
      transform: rotate(45deg);
    }
    .cluster-bubble {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      gap: ${CLUSTER_BUBBLE_GAP}px;
      padding: ${CLUSTER_BUBBLE_PADDING}px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      border-radius: 14px;
      filter: var(--ha-cluster-shadow);
      --ha-marker-size: ${CLUSTER_AVATAR_SIZE}px;
      --ha-marker-selected-scale: 1;
      --ha-marker-color: transparent;
      --ha-marker-border-width: 1px;
      --ha-marker-font-size: var(--ha-font-size-s);
      /* distinguish letter tiles from the bubble background */
      --ha-marker-background: var(--ha-color-fill-neutral-quiet-resting);
    }
    .cluster-bubble .more {
      flex: none;
      width: ${CLUSTER_MORE_WIDTH}px;
      height: ${CLUSTER_AVATAR_SIZE}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: var(--ha-color-fill-neutral-quiet-resting, #f0f0f0);
      color: var(--primary-text-color, #212121);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
    }
    /* Markers are rounded squares to match the cluster bubble avatars */
    ha-entity-marker {
      --ha-marker-border-radius: var(--ha-border-radius-lg);
    }
    .cluster-bubble ha-entity-marker {
      flex: none;
      --ha-marker-border-radius: 10px;
    }
    ${unsafeCSS(zoneMarkerStyles)}
    .leaflet-bottom {
      /* Lets a card keep the attribution and scale clear of an overlay */
      margin-bottom: var(--ha-map-bottom-inset, 0);
    }
    .leaflet-left {
      margin-left: var(--ha-map-left-inset, 0);
    }
    .leaflet-right {
      margin-right: var(--ha-map-right-inset, 0);
    }
    .leaflet-control,
    .leaflet-top,
    .leaflet-bottom {
      z-index: 1 !important;
    }
    .leaflet-control-scale {
      cursor: unset !important;
    }
    .leaflet-control-scale-line {
      --scale-ruler-color: var(--ha-color-on-surface-default);
      --scale-ruler-surface: var(--ha-color-surface-default);
      font-size: var(--ha-font-size-s);
      font-family: var(--ha-font-family-body);
      color: var(--scale-ruler-color) !important;
      background: color-mix(
        in srgb,
        var(--scale-ruler-surface) 80%,
        transparent
      ) !important;
      text-shadow: none !important;
      direction: ltr;
    }
    /* the theme tokens follow the page, so forced modes need the opposite values */
    #map.forced-light .leaflet-control-scale-line {
      --scale-ruler-color: var(--ha-color-neutral-05);
      --scale-ruler-surface: var(--ha-color-white);
    }
    #map.forced-dark .leaflet-control-scale-line {
      --scale-ruler-color: var(--ha-color-neutral-95);
      --scale-ruler-surface: var(--ha-color-neutral-10);
    }
    .leaflet-left .leaflet-control-scale {
      margin-left: 10px !important;
    }
    .leaflet-bottom .leaflet-control-scale {
      margin-bottom: 10px !important;
    }
    .leaflet-tooltip {
      padding: 8px;
      font-size: var(--ha-font-size-s);
      background: rgba(80, 80, 80, 0.9) !important;
      color: white !important;
      border-radius: var(--ha-border-radius-sm);
      box-shadow: none !important;
      text-align: center;
    }

    ha-icon {
      --mdc-icon-size: calc(var(--ha-marker-size, 48px) / 2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-map": HaMap;
  }
}
