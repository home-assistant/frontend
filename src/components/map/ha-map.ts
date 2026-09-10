import { consume, ContextConsumer } from "@lit/context";
import { isToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, ReactiveElement, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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
import { supportsWebGL2 } from "../../common/map/base-layer";
import type {
  MapClusterIcon,
  MapEngine,
  MapItemHandle,
  MapLatLng,
  MapMarkerHandle,
  MapPath,
  MapPathMarker,
  MapPathSegment,
  MapEditableCircleHandle,
  MapEditableMarkerHandle,
  MapEditingSupport,
} from "../../common/map/map-engine";
import { circleBoundsPoints } from "../../common/map/map-engine";
import { editableCircleStyles } from "../../common/map/editable-circle";
import { entityMapColor, zoneColor } from "../../common/map/entity-map-colors";
import {
  createZoneMarkerElement,
  ZONE_CIRCLE_SIZE,
  zoneMarkerStyles,
} from "../../common/map/zone-marker";
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
import type {
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
  ThemeMode,
} from "../../types";
import "./ha-entity-marker";

declare global {
  // for fire event
  interface HASSDomEvents {
    "map-clicked": { location: [number, number] };
  }
}

const PROGRAMMITIC_FIT_DELAY = 250;

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
const CLUSTER_MAX_AVATARS = 3;
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

  private _zonePositions: Record<string, MapLatLng> = {};

  @property({ attribute: "theme-mode", type: String })
  public themeMode: ThemeMode = "auto";

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

  private _registryConsumer?: ContextConsumer<typeof fullEntitiesContext, this>;

  private _entityHandles: MapMarkerHandle[] = [];

  private _zoneHandles: MapItemHandle[] = [];

  private _pathHandles: MapItemHandle[] = [];

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
    this._registryConsumer = new ContextConsumer(this, {
      context: fullEntitiesContext,
      subscribe: true,
      callback: (entries) => {
        this._entityReg = entries;
      },
    });
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
    this._entityHandles = [];
    this._zoneHandles = [];
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

    const oldUi = changedProps.get("_ui") as HomeAssistantUI | undefined;
    if (
      !changedProps.has("themeMode") &&
      (!changedProps.has("_ui") || (oldUi && oldUi.themes === this._ui.themes))
    ) {
      return;
    }

    this._updateMapStyle();
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
      (this.themeMode === "auto" && Boolean(this._ui?.themes.darkMode))
    );
  }

  private _updateMapStyle(): void {
    const map = this._mapElement!;
    map.classList.toggle("clickable", this.clickable);
    map.classList.toggle("dark", this._darkMode);
    map.classList.toggle("forced-dark", this.themeMode === "dark");
    map.classList.toggle("forced-light", this.themeMode === "light");
    this._engine?.setDarkMode(this._darkMode);
  }

  private _loading = false;

  private _forceLeaflet = false;

  // The engine being set up, so a disconnect can tear it down mid-init
  private _startingEngine?: MapEngine;

  private _setupAttempt = 0;

  // Each engine is its own chunk; a map only downloads the one it uses
  private async _createEngine(): Promise<MapEngine> {
    if (this._forceLeaflet || !supportsWebGL2()) {
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
    const onFallback = this._forceLeaflet || !supportsWebGL2();
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
    this.shadowRoot!.append(map);
    this._loading = true;
    const attempt = ++this._setupAttempt;
    let engine: MapEngine | undefined;
    try {
      // Without a connection or the tile proxy the map sets up without tiles
      const token = this._connection
        ? await ensureMapTilesToken(this._connection.connection)
        : undefined;

      const rasterOnly = this._forceLeaflet;
      engine = await this._createEngine();
      if (attempt !== this._setupAttempt) {
        return;
      }
      this._startingEngine = engine;
      await engine.init(map, {
        center: [
          this._config?.latitude ?? 52.3731339,
          this._config?.longitude ?? 4.8903147,
        ],
        zoom: this.zoom,
        darkMode: this._darkMode,
        token,
        rasterOnly: this._forceLeaflet,
        zoomControlPosition: "topleft",
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
      this._updateMapStyle();
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

    if (
      !this._focusPoints.length &&
      !this._focusZonePoints.length &&
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

    const points = [...this._focusPoints, ...this._focusZonePoints];

    // Editable locations contribute their bounds, radius included
    this.editableLocations?.forEach((editable) => {
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

  public fitBounds(
    boundingbox: MapLatLng[],
    options?: { zoom?: number; pad?: number }
  ) {
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
        this._editableHandles.set(id, {
          kind,
          source: editable,
          handle: editing.addEditableCircle(editable.location, {
            radius: editable.radius!,
            color: editable.color || defaultColor,
            centerElement: editable.element,
            centerSize: editable.elementSize,
            title,
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
          }),
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
      this._editableHandles.set(id, {
        kind,
        source: editable,
        cleanup,
        handle: support.addDraggableMarker(element, editable.location, {
          size: editable.elementSize ?? [16, 16],
          interactive: true,
          focusable: !!editable.activatable,
          title,
          onDragEnd: (location) => {
            dragged = true;
            fireEvent(this, "editable-location-moved", { id, location });
          },
        }),
      });
    }
    return changed;
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
    if (this._pathHandles.length) {
      this._pathHandles.forEach((handle) => handle.remove());
      this._pathHandles = [];
    }
    if (!this.paths) {
      return;
    }

    const darkPrimaryColor = getComputedStyle(this).getPropertyValue(
      "--dark-primary-color"
    );

    this.paths.forEach((path) => {
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
      this._pathHandles.push(this._engine!.addPath(enginePath));
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

    if (!this.entities) {
      engine.setClustering(null);
      return;
    }
    this._watchRegistry();

    const computedStyles = getComputedStyle(this);
    // A person's state is "home" for the home zone, the zone name otherwise
    const zoneByState: Record<string, string> = {};
    this._zonePositions = {};
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
        }
      }
    }

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
          this._zoneHandles.push(
            engine.addCircle(position, { radius, color: markerColor })
          );
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

        if (
          this.fitZones &&
          (typeof entity === "string" || entity.focus !== false)
        ) {
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

      const entityMarker = document.createElement("ha-entity-marker");
      entityMarker.showIcon =
        typeof entity !== "string" && entity.label_mode === "icon";
      entityMarker.entityId = getEntityId(entity);
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
        entityMapColor(getEntityId(entity), this._entityReg, computedStyles);
      entityMarker.entityColor = entityColor;
      if (typeof entity !== "string") {
        entityMarker.selected = entity.selected ?? false;
      }

      const clusterData: ClusterData = {
        entityId: getEntityId(entity),
        picture: entityMarker.entityPicture || undefined,
        label: entityName,
        showIcon: entityMarker.showIcon,
        unit: entityMarker.entityUnit ?? "",
        color: entityColor,
        selected: typeof entity !== "string" && (entity.selected ?? false),
        zoneId: ["person", "device_tracker"].includes(
          computeStateDomain(stateObj)
        )
          ? zoneByState[stateObj.state]
          : undefined,
      };

      const showAccuracy =
        !!gpsAccuracy && !(typeof entity !== "string" && entity.hide_accuracy);

      const markerSize = this._getMarkerSize(computedStyles);
      this._entityHandles.push(
        engine.addMarker(entityMarker, position, {
          size: [markerSize, markerSize],
          title,
          cluster: true,
          clusterData,
          decoration: showAccuracy
            ? { radius: gpsAccuracy!, color: entityColor }
            : undefined,
        })
      );

      if (typeof entity === "string" || entity.focus !== false) {
        this._focusPoints.push(position);
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

  // Renders a marker cluster as a bubble of its members' avatars
  private _createClusterBubble = (
    members: MapMarkerHandle[]
  ): MapClusterIcon => {
    const data = members.map((member) => member.clusterData as ClusterData);
    const shown = data.slice(0, CLUSTER_MAX_AVATARS);
    const hidden = data.length - shown.length;

    // With history trails shown, colored borders match avatars to trails
    const showColors = !!this.paths?.length;

    const bubble = document.createElement("div");
    bubble.className = "cluster-bubble";
    for (const member of shown) {
      const avatar = document.createElement("ha-entity-marker");
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
      }
      if (member?.selected) {
        avatar.selected = true;
      }
      bubble.appendChild(avatar);
    }

    let width =
      shown.length * CLUSTER_AVATAR_SIZE +
      (shown.length - 1) * CLUSTER_BUBBLE_GAP +
      2 * CLUSTER_BUBBLE_PADDING;
    if (hidden > 0) {
      const more = document.createElement("span");
      more.className = "more";
      more.textContent =
        hidden > CLUSTER_MORE_MAX ? `${CLUSTER_MORE_MAX}+` : `+${hidden}`;
      bubble.appendChild(more);
      width += CLUSTER_MORE_WIDTH + CLUSTER_BUBBLE_GAP;
    }

    // A cluster of one zone's occupants attaches to that zone's marker
    const zoneId = data[0]?.zoneId;
    const zonePosition = zoneId ? this._zonePositions[zoneId] : undefined;
    const atZone =
      !!zoneId &&
      !!zonePosition &&
      data.every((member) => member?.zoneId === zoneId);

    let height = CLUSTER_AVATAR_SIZE + 2 * CLUSTER_BUBBLE_PADDING;
    let root: HTMLElement = bubble;
    if (atZone) {
      root = document.createElement("div");
      root.className = "cluster-marker";
      const tail = document.createElement("div");
      tail.className = "cluster-bubble-tail";
      root.append(bubble, tail);
      height += CLUSTER_TAIL_HEIGHT;
    }

    return {
      element: root,
      size: [width, height],
      // Float above the zone circle, tail pointing at it
      ...(atZone && zonePosition
        ? {
            location: zonePosition,
            anchor: [
              width / 2,
              height + ZONE_CIRCLE_SIZE / 2 + CLUSTER_ZONE_SPACING,
            ] as [number, number],
          }
        : {}),
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
    }
    #map.clickable {
      cursor: pointer;
    }
    #map.dark {
      background: #090909;
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
    #map.clickable:active,
    #map:active {
      cursor: grabbing;
    }
    /* A cluster opened at its spot: the members in a bubble with a tail */
    .cluster-open {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .cluster-open-members {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
      padding: 6px;
      /* Six markers per row */
      max-width: calc(6 * var(--ha-marker-size, 48px) + 5 * 4px + 12px);
      background: var(--card-background-color, #fff);
      border-radius: 14px;
      box-shadow: var(--ha-box-shadow-s);
    }
    .cluster-open-tail {
      width: 10px;
      height: 10px;
      margin-top: -5px;
      border-radius: 2px;
      background: var(--card-background-color, #fff);
      transform: rotate(45deg);
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
    .dark .maplibregl-ctrl.maplibregl-ctrl-group {
      background-color: #1c1c1c;
    }
    .dark .maplibregl-ctrl-group button + button {
      border-top-color: #313131;
    }
    .dark .maplibregl-ctrl button .maplibregl-ctrl-icon {
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
      align-items: center;
      gap: ${CLUSTER_BUBBLE_GAP}px;
      padding: ${CLUSTER_BUBBLE_PADDING}px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      border-radius: 14px;
      box-shadow: var(--ha-box-shadow-s);
      --ha-marker-size: ${CLUSTER_AVATAR_SIZE}px;
      --ha-marker-color: transparent;
      --ha-marker-border-width: 1px;
      --ha-marker-shadow: none;
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
