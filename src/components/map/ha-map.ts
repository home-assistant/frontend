import { isToday } from "date-fns";
import type {
  Circle,
  CircleMarker,
  LatLngExpression,
  LatLngTuple,
  Layer,
  Map,
  Marker,
  Polyline,
  MarkerClusterGroup,
} from "leaflet";
import type { PropertyValues } from "lit";
import { css, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { formatDateTime } from "../../common/datetime/format_date_time";
import {
  formatTimeWeekday,
  formatTimeWithSeconds,
} from "../../common/datetime/format_time";
import type { LeafletModuleType } from "../../common/dom/setup-leaflet-map";
import { setupLeafletMap } from "../../common/dom/setup-leaflet-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import type { HomeAssistant, ThemeMode } from "../../types";
import { isTouch } from "../../util/is_touch";
import "../ha-icon-button";
import "./ha-entity-marker";
import { DecoratedMarker } from "../../common/map/decorated_marker";

declare global {
  // for fire event
  interface HASSDomEvents {
    "map-clicked": { location: [number, number] };
  }
}

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

export interface HaMapEntity {
  entity_id: string;
  color: string;
  label_mode?: "name" | "state" | "attribute" | "icon";
  attribute?: string;
  unit?: string;
  name?: string;
  focus?: boolean;
}

@customElement("ha-map")
export class HaMap extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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

  @state() private _loaded = false;

  public leafletMap?: Map;

  private Leaflet?: LeafletModuleType;

  private _resizeObserver?: ResizeObserver;

  private _mapItems: (Marker | Circle)[] = [];

  private _mapFocusItems: (Marker | Circle)[] = [];

  private _mapZones: DecoratedMarker[] = [];

  private _mapFocusZones: (Marker | Circle)[] = [];

  private _mapCluster: MarkerClusterGroup | undefined;

  private _mapPaths: (Polyline | CircleMarker)[] = [];

  private _clickCount = 0;

  public connectedCallback(): void {
    super.connectedCallback();
    this._loadMap();
    this._attachObserver();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
      this.Leaflet = undefined;
    }

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
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (changedProps.has("_loaded") || changedProps.has("entities")) {
      this._drawEntities();
      autoFitRequired = true;
    } else if (this._loaded && oldHass && this.entities) {
      // Check if any state has changed
      for (const entity of this.entities) {
        if (
          oldHass.states[getEntityId(entity)] !==
          this.hass!.states[getEntityId(entity)]
        ) {
          this._drawEntities();
          autoFitRequired = true;
          break;
        }
      }
    }

    if (changedProps.has("clusterMarkers")) {
      this._drawEntities();
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
      this.leafletMap!.setZoom(this.zoom);
    }

    if (
      !changedProps.has("themeMode") &&
      (!changedProps.has("hass") ||
        (oldHass && oldHass.themes?.darkMode === this.hass.themes?.darkMode))
    ) {
      return;
    }

    this._updateMapStyle();
  }

  private get _darkMode() {
    return (
      this.themeMode === "dark" ||
      (this.themeMode === "auto" && Boolean(this.hass.themes.darkMode))
    );
  }

  private _updateMapStyle(): void {
    const map = this.renderRoot.querySelector("#map");
    map!.classList.toggle("clickable", this.clickable);
    map!.classList.toggle("dark", this._darkMode);
    map!.classList.toggle("forced-dark", this.themeMode === "dark");
    map!.classList.toggle("forced-light", this.themeMode === "light");
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
      [this.leafletMap, this.Leaflet] = await setupLeafletMap(map);
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
      this._loaded = true;
    } finally {
      this._loading = false;
    }
  }

  public fitMap(options?: { zoom?: number; pad?: number }): void {
    if (!this.leafletMap || !this.Leaflet || !this.hass) {
      return;
    }

    if (
      !this._mapFocusItems.length &&
      !this._mapFocusZones.length &&
      !this.layers?.length
    ) {
      this.leafletMap.setView(
        new this.Leaflet.LatLng(
          this.hass.config.latitude,
          this.hass.config.longitude
        ),
        options?.zoom || this.zoom
      );
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

    this.leafletMap.fitBounds(bounds, { maxZoom: options?.zoom || this.zoom });
  }

  public fitBounds(
    boundingbox: LatLngExpression[],
    options?: { zoom?: number; pad?: number }
  ) {
    if (!this.leafletMap || !this.Leaflet || !this.hass) {
      return;
    }
    const bounds = this.Leaflet.latLngBounds(boundingbox).pad(
      options?.pad ?? 0.5
    );
    this.leafletMap.fitBounds(bounds, { maxZoom: options?.zoom || this.zoom });
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
        this.hass.locale,
        this.hass.config
      );
    } else if (isToday(point.timestamp)) {
      formattedTime = formatTimeWithSeconds(
        point.timestamp,
        this.hass.locale,
        this.hass.config
      );
    } else {
      formattedTime = formatTimeWeekday(
        point.timestamp,
        this.hass.locale,
        this.hass.config
      );
    }
    return `${path.name}<br>${formattedTime}`;
  }

  private _drawPaths(): void {
    const hass = this.hass;
    const map = this.leafletMap;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Leaflet = this.Leaflet;

    if (!hass || !map || !Leaflet) {
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

        // DRAW point
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

        // DRAW line between this and next point
        this._mapPaths.push(
          Leaflet.polyline(
            [path.points[pointIndex].point, path.points[pointIndex + 1].point],
            {
              color: path.color || darkPrimaryColor,
              opacity,
              interactive: false,
            }
          )
        );
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
    const hass = this.hass;
    const map = this.leafletMap;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Leaflet = this.Leaflet;

    if (!hass || !map || !Leaflet) {
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
      const stateObj = hass.states[getEntityId(entity)];
      if (!stateObj) {
        continue;
      }
      const customTitle = typeof entity !== "string" ? entity.name : undefined;
      const title = customTitle ?? computeStateName(stateObj);
      const {
        latitude,
        longitude,
        passive,
        icon,
        radius,
        entity_picture: entityPicture,
        gps_accuracy: gpsAccuracy,
      } = stateObj.attributes;

      if (!(latitude && longitude)) {
        continue;
      }

      if (computeStateDomain(stateObj) === "zone") {
        // DRAW ZONE
        if (passive && !this.renderPassive) {
          continue;
        }

        // create icon
        let iconHTML = "";
        if (icon) {
          const el = document.createElement("ha-icon");
          el.setAttribute("icon", icon);
          iconHTML = el.outerHTML;
        } else {
          const el = document.createElement("span");
          el.innerHTML = title;
          iconHTML = el.outerHTML;
        }

        // create circle around it
        const circle = Leaflet.circle([latitude, longitude], {
          interactive: false,
          color: passive ? passiveZoneColor : zoneColor,
          radius,
        });

        const marker = new DecoratedMarker([latitude, longitude], circle, {
          icon: Leaflet.divIcon({
            html: iconHTML,
            iconSize: [24, 24],
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
          ? this.hass.formatEntityState(stateObj)
          : typeof entity !== "string" &&
              entity.label_mode === "attribute" &&
              entity.attribute !== undefined
            ? this.hass.formatEntityAttributeValue(stateObj, entity.attribute)
            : (customTitle ??
              title
                .split(" ")
                .map((part) => part[0])
                .join("")
                .substr(0, 3));

      const entityMarker = document.createElement("ha-entity-marker");
      entityMarker.hass = this.hass;
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
          ? this.hass.hassUrl(entityPicture)
          : "";
      if (typeof entity !== "string") {
        entityMarker.entityColor = entity.color;
      }

      // create marker with the icon
      const marker = new DecoratedMarker([latitude, longitude], undefined, {
        icon: Leaflet.divIcon({
          html: entityMarker,
          iconSize: [48, 48],
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

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this.leafletMap?.invalidateSize({ debounceMoveend: true });
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
    .leaflet-tile-pane {
      filter: var(--map-filter);
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
      border-radius: 50%;
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
    .leaflet-tooltip {
      padding: 8px;
      font-size: var(--ha-font-size-s);
      background: rgba(80, 80, 80, 0.9) !important;
      color: white !important;
      border-radius: 4px;
      box-shadow: none !important;
      text-align: center;
    }

    .marker-cluster div {
      background-clip: padding-box;
      background-color: var(--primary-color);
      border: 3px solid rgba(var(--rgb-primary-color), 0.2);
      width: 32px;
      height: 32px;
      border-radius: 20px;
      text-align: center;
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
