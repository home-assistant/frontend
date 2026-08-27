import { consume } from "@lit/context";
import { isToday } from "date-fns";
import type { HassConfig, HassEntities } from "home-assistant-js-websocket";
import type {
  Circle,
  CircleMarker,
  Control,
  LatLngExpression,
  LatLngTuple,
  Layer,
  Map,
  Marker,
  MarkerClusterGroup,
  Polyline,
} from "leaflet";
import type { PropertyValues } from "lit";
import { css, ReactiveElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { formatDateTime } from "../../common/datetime/format_date_time";
import {
  formatTimeWeekday,
  formatTimeWithSeconds,
} from "../../common/datetime/format_time";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import type { LeafletModuleType } from "../../common/dom/setup-leaflet-map";
import { setupLeafletMap } from "../../common/dom/setup-leaflet-map";
import type { MapBaseLayer } from "../../common/map/base-layer";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { getEntityLocation } from "../../common/entity/get_entity_location";
import { ensureMapTilesToken } from "../../data/map_tiles";
import { DecoratedMarker } from "../../common/map/decorated_marker";
import { filterXSS } from "../../common/util/xss";
import {
  configContext,
  connectionContext,
  formattersContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../data/context";
import type {
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
  ThemeMode,
} from "../../types";
import { isTouch } from "../../util/is_touch";
import "../ha-icon-button";
import "./ha-entity-marker";
import { UNIT_KM } from "../../common/const";

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
  point: LatLngTuple;
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

export interface HaMapEntity {
  entity_id: string;
  color: string;
  label_mode?: MapCardMarkerLabelMode;
  attribute?: string;
  unit?: string;
  name?: string;
  focus?: boolean;
}

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

  @property({ attribute: false }) public layers?: Layer[];

  @property({ type: Boolean }) public clickable = false;

  @property({ attribute: "auto-fit", type: Boolean }) public autoFit = false;

  @property({ attribute: "render-passive", type: Boolean })
  public renderPassive = false;

  @property({ attribute: "interactive-zones", type: Boolean })
  public interactiveZones = false;

  @property({ attribute: "fit-zones", type: Boolean }) public fitZones = false;

  @property({ attribute: "theme-mode", type: String })
  public themeMode: ThemeMode = "auto";

  @property({ type: Number }) public zoom = 14;

  @property({ attribute: "cluster-markers", type: Boolean })
  public clusterMarkers = true;

  @property({ attribute: "scale-ruler", type: Boolean })
  public scaleRuler = false;

  @state() private _loaded = false;

  @query("#map") private _mapElement?: HTMLElement;

  public leafletMap?: Map;

  private Leaflet?: LeafletModuleType;

  private _baseLayer?: MapBaseLayer;

  private _resizeObserver?: ResizeObserver;

  private _mapItems: (Marker | Circle)[] = [];

  private _mapFocusItems: (Marker | Circle)[] = [];

  private _mapZones: DecoratedMarker[] = [];

  private _mapFocusZones: (Marker | Circle)[] = [];

  private _mapCluster: MarkerClusterGroup | undefined;

  private _scaleRulerControl?: Control.Scale;

  private _mapPaths: (Polyline | CircleMarker)[] = [];

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
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
      this.Leaflet = undefined;
      this._baseLayer = undefined;
    }

    // the control went away with the map, so don't hold on to it
    this._scaleRulerControl = undefined;
    this._pendingFit = undefined;
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

    if (changedProps.has("clusterMarkers")) {
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
    }

    if (changedProps.has("_loaded") || changedProps.has("layers")) {
      this._drawLayers(changedProps.get("layers") as Layer[] | undefined);
      autoFitRequired = true;
    }

    if (changedProps.has("_loaded") || (this.autoFit && autoFitRequired)) {
      this.fitMap();
    }

    if (changedProps.has("zoom")) {
      this._isProgrammaticFit = true;
      this.leafletMap!.setZoom(this.zoom);
      setTimeout(() => {
        this._isProgrammaticFit = false;
      }, PROGRAMMITIC_FIT_DELAY);
    }

    const oldUi = changedProps.get("_ui") as HomeAssistantUI | undefined;
    if (
      !changedProps.has("themeMode") &&
      (!changedProps.has("_ui") ||
        (oldUi && oldUi.themes?.darkMode === this._ui.themes?.darkMode))
    ) {
      return;
    }

    this._updateMapStyle();
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
    this._baseLayer?.setDarkMode(this._darkMode);
  }

  private _loading = false;

  private async _loadMap(): Promise<void> {
    if (this._loading) return;
    let map = this.shadowRoot!.getElementById("map");
    if (!map) {
      map = document.createElement("div");
      map.id = "map";
      this.shadowRoot!.append(map);
    }
    this._loading = true;
    try {
      // The tiles are proxied by core behind a token, so nothing loads without
      // one. A host that provides no connection, or a backend without the
      // proxy, leaves the map without tiles rather than failing to set up.
      const token = this._connection
        ? await ensureMapTilesToken(this._connection.connection)
        : undefined;

      const setup = await setupLeafletMap(map, {
        latitude: this._config?.latitude ?? 52.3731339,
        longitude: this._config?.longitude ?? 4.8903147,
        zoom: this.zoom,
        darkMode: this._darkMode,
        token,
      });
      // Setting up fetches a style, so the element can be gone by now.
      // `disconnectedCallback` had no map to tear down, and keeping this one
      // would leave a live map - and its WebGL context - on a detached host,
      // and its container too initialized to set up again on reconnect.
      if (!this.isConnected) {
        setup.map.remove();
        return;
      }
      this.leafletMap = setup.map;
      this.Leaflet = setup.leaflet;
      this._baseLayer = setup.baseLayer;
      this._updateMapStyle();
      this.leafletMap.on("click", (ev) => {
        if (this._clickCount === 0) {
          setTimeout(() => {
            if (this._clickCount === 1) {
              fireEvent(this, "map-clicked", {
                location: [ev.latlng.lat, ev.latlng.lng],
              });
            }
            this._clickCount = 0;
          }, 250);
        }
        this._clickCount++;
      });
      this.leafletMap.on("zoomstart", () => {
        if (!this._isProgrammaticFit) {
          this._pauseAutoFit = true;
        }
      });
      this.leafletMap.on("movestart", () => {
        if (!this._isProgrammaticFit) {
          this._pauseAutoFit = true;
        }
      });
      this._loaded = true;
    } finally {
      this._loading = false;
    }
  }

  public fitMap(options?: {
    zoom?: number;
    pad?: number;
    unpause_autofit?: boolean;
  }): void {
    if (options?.unpause_autofit) {
      this._pauseAutoFit = false;
    }
    if (!this.leafletMap || !this.Leaflet || !this._config) {
      return;
    }

    if (this._deferIfUnsized(() => this.fitMap(options))) {
      return;
    }

    if (
      !this._mapFocusItems.length &&
      !this._mapFocusZones.length &&
      !this.layers?.length
    ) {
      this._isProgrammaticFit = true;
      this.leafletMap.setView(
        new this.Leaflet.LatLng(this._config.latitude, this._config.longitude),
        options?.zoom || this.zoom
      );
      setTimeout(() => {
        this._isProgrammaticFit = false;
      }, PROGRAMMITIC_FIT_DELAY);
      return;
    }

    let bounds = this.Leaflet.latLngBounds(
      this._mapFocusItems
        ? this._mapFocusItems.map((item) => item.getLatLng())
        : []
    );

    this._mapFocusZones?.forEach((zone) => {
      bounds.extend("getBounds" in zone ? zone.getBounds() : zone.getLatLng());
    });

    this.layers?.forEach((layer: any) => {
      bounds.extend(
        "getBounds" in layer ? layer.getBounds() : layer.getLatLng()
      );
    });

    bounds = bounds.pad(options?.pad ?? 0.5);
    this._isProgrammaticFit = true;
    this.leafletMap.fitBounds(bounds, { maxZoom: options?.zoom || this.zoom });
    setTimeout(() => {
      this._isProgrammaticFit = false;
    }, PROGRAMMITIC_FIT_DELAY);
  }

  // Leaflet derives the zoom level that fits given bounds from the current
  // size of the map container. When the container has not been laid out yet,
  // that size is 0x0 and the computed zoom collapses to the minimum, leaving
  // the map zoomed out to the world even after the container gets its size.
  // Defer fitting until the resize observer reports a usable size.
  private _deferIfUnsized(fit: () => void): boolean {
    const size = this.leafletMap!.getSize();
    if (size.x > 0 && size.y > 0) {
      this._pendingFit = undefined;
      return false;
    }
    const container = this.leafletMap!.getContainer();
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      // The container was laid out since Leaflet last measured it.
      this.leafletMap!.invalidateSize(false);
      this._pendingFit = undefined;
      return false;
    }
    this._pendingFit = fit;
    return true;
  }

  private _runPendingFit(): void {
    if (!this._pendingFit || !this.leafletMap) {
      return;
    }
    const size = this.leafletMap.getSize();
    if (size.x > 0 && size.y > 0) {
      const pendingFit = this._pendingFit;
      this._pendingFit = undefined;
      pendingFit();
    }
  }

  public fitBounds(
    boundingbox: LatLngExpression[],
    options?: { zoom?: number; pad?: number }
  ) {
    if (!this.leafletMap || !this.Leaflet) {
      return;
    }
    if (this._deferIfUnsized(() => this.fitBounds(boundingbox, options))) {
      return;
    }
    const bounds = this.Leaflet.latLngBounds(boundingbox).pad(
      options?.pad ?? 0.5
    );
    this._isProgrammaticFit = true;
    this.leafletMap.fitBounds(bounds, { maxZoom: options?.zoom || this.zoom });
    setTimeout(() => {
      this._isProgrammaticFit = false;
    }, PROGRAMMITIC_FIT_DELAY);
  }

  private _drawLayers(prevLayers: Layer[] | undefined): void {
    if (prevLayers) {
      prevLayers.forEach((layer) => layer.remove());
    }
    if (!this.layers) {
      return;
    }
    const map = this.leafletMap!;
    this.layers.forEach((layer) => {
      map.addLayer(layer);
    });
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
    const map = this.leafletMap;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Leaflet = this.Leaflet;

    if (!this._i18n || !this._config || !map || !Leaflet) {
      return;
    }
    if (this._mapPaths.length) {
      this._mapPaths.forEach((marker) => marker.remove());
      this._mapPaths = [];
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

        // DRAW point
        this._mapPaths.push(
          Leaflet.circleMarker(thisPoint.point, {
            radius: isTouch ? 8 : 3,
            color: path.color || darkPrimaryColor,
            opacity,
            fillOpacity: opacity,
            interactive: true,
          }).bindTooltip(this._computePathTooltip(path, thisPoint), {
            direction: "top",
          })
        );

        // DRAW line between this and next point
        if (Math.abs(thisPoint.point[1] - nextPoint.point[1]) <= 180) {
          // if the path does not cross the antimeridian, draw a simple line
          // between the two points
          this._mapPaths.push(
            Leaflet.polyline([thisPoint.point, nextPoint.point], {
              color: path.color || darkPrimaryColor,
              opacity,
              interactive: false,
            })
          );
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

          const intersectionPoint1: LatLngTuple = [
            intersectionLatitude,
            thisPoint.point[1] > 0 ? 180 : -180,
          ];
          const intersectionPoint2: LatLngTuple = [
            intersectionLatitude,
            nextPoint.point[1] > 0 ? 180 : -180,
          ];

          this._mapPaths.push(
            Leaflet.polyline([thisPoint.point, intersectionPoint1], {
              color: path.color || darkPrimaryColor,
              opacity,
              interactive: false,
            })
          );
          this._mapPaths.push(
            Leaflet.polyline([intersectionPoint2, nextPoint.point], {
              color: path.color || darkPrimaryColor,
              opacity,
              interactive: false,
            })
          );
        }
      }
      const pointIndex = path.points.length - 1;
      if (pointIndex >= 0) {
        const opacity = path.gradualOpacity
          ? baseOpacity! + pointIndex * opacityStep!
          : undefined;
        // DRAW end path point
        this._mapPaths.push(
          Leaflet.circleMarker(path.points[pointIndex].point, {
            radius: isTouch ? 8 : 3,
            color: path.color || darkPrimaryColor,
            opacity,
            fillOpacity: opacity,
            interactive: true,
          }).bindTooltip(
            this._computePathTooltip(path, path.points[pointIndex]),
            { direction: "top" }
          )
        );
      }
      this._mapPaths.forEach((marker) => map.addLayer(marker));
    });
  }

  private _drawEntities(): void {
    const states = this._states;
    const map = this.leafletMap;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Leaflet = this.Leaflet;

    if (!states || !map || !Leaflet) {
      return;
    }

    if (this._mapItems.length) {
      this._mapItems.forEach((marker) => marker.remove());
      this._mapItems = [];
      this._mapFocusItems = [];
    }

    if (this._mapZones.length) {
      this._mapZones.forEach((marker) => marker.remove());
      this._mapZones = [];
      this._mapFocusZones = [];
    }

    if (this._mapCluster) {
      this._mapCluster.remove();
      this._mapCluster = undefined;
    }

    if (!this.entities) {
      return;
    }

    const computedStyles = getComputedStyle(this);
    const zoneColor = computedStyles.getPropertyValue("--accent-color");
    const passiveZoneColor = computedStyles.getPropertyValue(
      "--secondary-text-color"
    );

    const darkPrimaryColor = computedStyles.getPropertyValue(
      "--dark-primary-color"
    );

    const className = this._darkMode ? "dark" : "light";

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

      if (computeStateDomain(stateObj) === "zone") {
        // DRAW ZONE
        if (passive && !this.renderPassive) {
          continue;
        }

        // create icon
        let iconHTML: string;
        if (icon) {
          const el = document.createElement("ha-icon");
          el.setAttribute("icon", icon);
          iconHTML = el.outerHTML;
        } else {
          const el = document.createElement("span");
          el.textContent = title;
          iconHTML = el.outerHTML;
        }

        // create circle around it
        const circle = Leaflet.circle([latitude, longitude], {
          interactive: false,
          color: passive ? passiveZoneColor : zoneColor,
          radius,
        });

        const markerIconSize = this._getMarkerSize(computedStyles) / 2;
        const marker = new DecoratedMarker([latitude, longitude], circle, {
          icon: Leaflet.divIcon({
            html: iconHTML,
            iconSize: [markerIconSize, markerIconSize],
            className,
          }),
          interactive: this.interactiveZones,
          title,
        });

        this._mapZones.push(marker);
        if (
          this.fitZones &&
          (typeof entity === "string" || entity.focus !== false)
        ) {
          this._mapFocusZones.push(circle);
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
      if (typeof entity !== "string") {
        entityMarker.entityColor = entity.color;
      }

      // create marker with the icon
      const markerSize = this._getMarkerSize(computedStyles);
      const marker = new DecoratedMarker([latitude, longitude], undefined, {
        icon: Leaflet.divIcon({
          html: entityMarker,
          iconSize: [markerSize, markerSize],
          className: "",
        }),
        title: title,
      });
      if (typeof entity === "string" || entity.focus !== false) {
        this._mapFocusItems.push(marker);
      }

      // create circle around if entity has accuracy
      if (gpsAccuracy) {
        marker.decorationLayer = Leaflet.circle([latitude, longitude], {
          interactive: false,
          color: darkPrimaryColor,
          radius: gpsAccuracy,
        });
      }

      this._mapItems.push(marker);
    }

    if (this.clusterMarkers) {
      this._mapCluster = Leaflet.markerClusterGroup({
        showCoverageOnHover: false,
        removeOutsideVisibleBounds: false,
        maxClusterRadius: 40,
      });
      this._mapCluster.addLayers(this._mapItems);
      map.addLayer(this._mapCluster);
    } else {
      this._mapItems.forEach((marker) => map.addLayer(marker));
    }

    this._mapZones.forEach((marker) => map.addLayer(marker));
  }

  private _drawScaleRuler(): void {
    if (this._scaleRulerControl) {
      this.leafletMap?.removeControl(this._scaleRulerControl);
      this._scaleRulerControl = undefined;
    }

    if (!this.scaleRuler || !this.leafletMap || !this.Leaflet) {
      return;
    }

    const metric = this._config?.unit_system?.length === UNIT_KM;
    this._scaleRulerControl = this.Leaflet.control.scale({
      position: "bottomleft",
      metric,
      imperial: !metric,
    });
    this._scaleRulerControl.addTo(this.leafletMap);
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
        this.leafletMap?.invalidateSize({ debounceMoveend: true });
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
      cursor: -moz-grabbing;
      cursor: -webkit-grabbing;
    }
    /* Only the raster fallback is inverted for dark mode, the vector style
       ships its own dark cartography. */
    .leaflet-tile-pane .leaflet-tile {
      filter: var(--map-filter);
    }
    /* The only two rules the MapLibre canvas needs from its stylesheet, the
       rest of it styles controls and popups we do not render. */
    .maplibregl-map {
      position: relative;
      overflow: hidden;
    }
    .maplibregl-canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
    .dark .leaflet-bar a {
      background-color: #1c1c1c;
      color: #ffffff;
    }
    .dark .leaflet-bar a:hover {
      background-color: #313131;
    }
    .leaflet-marker-draggable {
      cursor: move !important;
    }
    .leaflet-edit-resize {
      border-radius: var(--ha-border-radius-circle);
      cursor: nesw-resize !important;
    }
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

    .marker-cluster div {
      background-clip: padding-box;
      background-color: var(--primary-color);
      border: 3px solid rgba(var(--rgb-primary-color), 0.2);
      width: calc(var(--ha-marker-size, 48px) * 0.667);
      height: calc(var(--ha-marker-size, 48px) * 0.667);
      border-radius: 50%;
      text-align: center;
      align-content: center;
      color: var(--text-primary-color);
      font-size: var(--ha-font-size-m);
    }

    .marker-cluster span {
      line-height: var(--ha-line-height-expanded);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-map": HaMap;
  }
}
