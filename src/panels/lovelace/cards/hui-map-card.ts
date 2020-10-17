import { HassEntity } from "home-assistant-js-websocket";
import {
  Circle,
  CircleMarker,
  LatLngTuple,
  Layer,
  Map,
  Marker,
  Polyline,
  TileLayer,
} from "leaflet";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import {
  LeafletModuleType,
  replaceTileLayer,
  setupLeafletMap,
} from "../../../common/dom/setup-leaflet-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { debounce } from "../../../common/util/debounce";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { fetchRecent } from "../../../data/history";
import { HomeAssistant } from "../../../types";
import "../../map/ha-entity-marker";
import { findEntities } from "../common/find-entites";
import { installResizeObserver } from "../common/install-resize-observer";
import { processConfigEntities } from "../common/process-config-entities";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { MapCardConfig } from "./types";

@customElement("hui-map-card")
class HuiMapCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import(
      /* webpackChunkName: "hui-map-card-editor" */ "../editor/config-elements/hui-map-card-editor"
    );
    return document.createElement("hui-map-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): MapCardConfig {
    const includeDomains = ["device_tracker"];
    const maxEntities = 2;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "map", entities: foundEntities };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public isPanel = false;

  @property({ type: Boolean, reflect: true })
  public editMode = false;

  @property()
  private _history?: HassEntity[][];

  private _date?: Date;

  @property()
  private _config?: MapCardConfig;

  private _configEntities?: EntityConfig[];

  // eslint-disable-next-line
  private Leaflet?: LeafletModuleType;

  private _leafletMap?: Map;

  private _tileLayer?: TileLayer;

  private _resizeObserver?: ResizeObserver;

  private _debouncedResizeListener = debounce(
    () => {
      if (!this.isConnected || !this._leafletMap) {
        return;
      }
      this._leafletMap.invalidateSize();
    },
    250,
    false
  );

  private _mapItems: Array<Marker | Circle> = [];

  private _mapZones: Array<Marker | Circle> = [];

  private _mapPaths: Array<Polyline | CircleMarker> = [];

  private _colorDict: { [key: string]: string } = {};

  private _colorIndex = 0;

  private _colors: string[] = [
    "#0288D1",
    "#00AA00",
    "#984ea3",
    "#00d2d5",
    "#ff7f00",
    "#af8d00",
    "#7f80cd",
    "#b3e900",
    "#c42e60",
    "#a65628",
    "#f781bf",
    "#8dd3c7",
  ];

  public setConfig(config: MapCardConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    if (!config.entities && !config.geo_location_sources) {
      throw new Error(
        "Either entities or geo_location_sources must be defined"
      );
    }
    if (config.entities && !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }
    if (
      config.geo_location_sources &&
      !Array.isArray(config.geo_location_sources)
    ) {
      throw new Error("Geo_location_sources needs to be an array");
    }

    this._config = config;
    this._configEntities = config.entities
      ? processConfigEntities(config.entities)
      : [];

    this._cleanupHistory();
  }

  public getCardSize(): number {
    if (!this._config?.aspect_ratio) {
      return 7;
    }

    const ratio = parseAspectRatio(this._config.aspect_ratio);
    const ar =
      ratio && ratio.w > 0 && ratio.h > 0
        ? `${((100 * ratio.h) / ratio.w).toFixed(2)}`
        : "100";
    return 1 + Math.floor(Number(ar) / 25) || 3;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._attachObserver();
    if (this.hasUpdated) {
      this.loadMap();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this._leafletMap) {
      this._leafletMap.remove();
      this._leafletMap = undefined;
      this.Leaflet = undefined;
    }

    if (this._resizeObserver) {
      this._resizeObserver.unobserve(this._mapEl);
    }
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }
    return html`
      <ha-card id="card" .header=${this._config.title}>
        <div id="root">
          <div
            id="map"
            class=${classMap({ dark: this._config.dark_mode === true })}
          ></div>
          <ha-icon-button
            @click=${this._fitMap}
            tabindex="0"
            icon="hass:image-filter-center-focus"
            title="Reset focus"
          ></ha-icon-button>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps) {
    if (!changedProps.has("hass") || changedProps.size > 1) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (!oldHass || !this._configEntities) {
      return true;
    }

    if (oldHass.themes.darkMode !== this.hass.themes.darkMode) {
      return true;
    }

    // Check if any state has changed
    for (const entity of this._configEntities) {
      if (oldHass.states[entity.entity] !== this.hass!.states[entity.entity]) {
        return true;
      }
    }

    return false;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (this.isConnected) {
      this.loadMap();
    }
    const root = this.shadowRoot!.getElementById("root");

    if (!this._config || this.isPanel || !root) {
      return;
    }

    this._attachObserver();

    if (!this._config.aspect_ratio) {
      root.style.paddingBottom = "100%";
      return;
    }

    const ratio = parseAspectRatio(this._config.aspect_ratio);

    root.style.paddingBottom =
      ratio && ratio.w > 0 && ratio.h > 0
        ? `${((100 * ratio.h) / ratio.w).toFixed(2)}%`
        : (root.style.paddingBottom = "100%");
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass") || changedProps.has("_history")) {
      this._drawEntities();
      this._fitMap();
    }
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (oldHass && oldHass.themes.darkMode !== this.hass.themes.darkMode) {
        this._replaceTileLayer();
      }
    }
    if (
      changedProps.has("_config") &&
      changedProps.get("_config") !== undefined
    ) {
      this.updateMap(changedProps.get("_config") as MapCardConfig);
    }

    if (this._config!.hours_to_show && this._configEntities?.length) {
      const minute = 60000;
      if (changedProps.has("_config")) {
        this._getHistory();
      } else if (Date.now() - this._date!.getTime() >= minute) {
        this._getHistory();
      }
    }
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.getElementById("map") as HTMLDivElement;
  }

  private async loadMap(): Promise<void> {
    [this._leafletMap, this.Leaflet, this._tileLayer] = await setupLeafletMap(
      this._mapEl,
      this._config!.dark_mode ?? this.hass.themes.darkMode
    );
    this._drawEntities();
    this._leafletMap.invalidateSize();
    this._fitMap();
  }

  private _replaceTileLayer() {
    const map = this._leafletMap;
    const config = this._config;
    const Leaflet = this.Leaflet;
    if (!map || !config || !Leaflet || !this._tileLayer) {
      return;
    }
    this._tileLayer = replaceTileLayer(
      Leaflet,
      map,
      this._tileLayer,
      this._config!.dark_mode ?? this.hass.themes.darkMode
    );
  }

  private updateMap(oldConfig: MapCardConfig): void {
    const map = this._leafletMap;
    const config = this._config;
    const Leaflet = this.Leaflet;
    if (!map || !config || !Leaflet || !this._tileLayer) {
      return;
    }
    if (this._config!.dark_mode !== oldConfig.dark_mode) {
      this._replaceTileLayer();
    }
    if (
      config.entities !== oldConfig.entities ||
      config.geo_location_sources !== oldConfig.geo_location_sources
    ) {
      this._drawEntities();
    }
    map.invalidateSize();
    this._fitMap();
  }

  private _fitMap(): void {
    if (!this._leafletMap || !this.Leaflet || !this._config || !this.hass) {
      return;
    }
    const zoom = this._config.default_zoom;
    if (this._mapItems.length === 0) {
      this._leafletMap.setView(
        new this.Leaflet.LatLng(
          this.hass.config.latitude,
          this.hass.config.longitude
        ),
        zoom || 14
      );
      return;
    }

    const bounds = this.Leaflet.featureGroup(this._mapItems).getBounds();
    this._leafletMap.fitBounds(bounds.pad(0.5));

    if (zoom && this._leafletMap.getZoom() > zoom) {
      this._leafletMap.setZoom(zoom);
    }
  }

  private _getColor(entityId: string) {
    let color;
    if (this._colorDict[entityId]) {
      color = this._colorDict[entityId];
    } else {
      color = this._colors[this._colorIndex];
      this._colorIndex = (this._colorIndex + 1) % this._colors.length;
      this._colorDict[entityId] = color;
    }
    return color;
  }

  private _drawEntities(): void {
    const hass = this.hass;
    const map = this._leafletMap;
    const config = this._config;
    const Leaflet = this.Leaflet;
    if (!hass || !map || !config || !Leaflet) {
      return;
    }

    if (this._mapItems) {
      this._mapItems.forEach((marker) => marker.remove());
    }
    const mapItems: Layer[] = (this._mapItems = []);

    if (this._mapZones) {
      this._mapZones.forEach((marker) => marker.remove());
    }
    const mapZones: Layer[] = (this._mapZones = []);

    if (this._mapPaths) {
      this._mapPaths.forEach((marker) => marker.remove());
    }
    const mapPaths: Layer[] = (this._mapPaths = []);

    const allEntities = this._configEntities!.concat();

    // Calculate visible geo location sources
    if (config.geo_location_sources) {
      const includesAll = config.geo_location_sources.includes("all");
      for (const entityId of Object.keys(hass.states)) {
        const stateObj = hass.states[entityId];
        if (
          computeDomain(entityId) === "geo_location" &&
          (includesAll ||
            config.geo_location_sources.includes(stateObj.attributes.source))
        ) {
          allEntities.push({ entity: entityId });
        }
      }
    }

    // DRAW history
    if (this._config!.hours_to_show && this._history) {
      for (const entityStates of this._history) {
        if (entityStates?.length <= 1) {
          continue;
        }
        const entityId = entityStates[0].entity_id;

        // filter location data from states and remove all invalid locations
        const path = entityStates.reduce(
          (accumulator: LatLngTuple[], state) => {
            const latitude = state.attributes.latitude;
            const longitude = state.attributes.longitude;
            if (latitude && longitude) {
              accumulator.push([latitude, longitude] as LatLngTuple);
            }
            return accumulator;
          },
          []
        ) as LatLngTuple[];

        // DRAW HISTORY
        for (
          let markerIndex = 0;
          markerIndex < path.length - 1;
          markerIndex++
        ) {
          const opacityStep = 0.8 / (path.length - 2);
          const opacity = 0.2 + markerIndex * opacityStep;

          // DRAW history path dots
          mapPaths.push(
            Leaflet.circleMarker(path[markerIndex], {
              radius: 3,
              color: this._getColor(entityId),
              opacity,
              interactive: false,
            })
          );

          // DRAW history path lines
          const line = [path[markerIndex], path[markerIndex + 1]];
          mapPaths.push(
            Leaflet.polyline(line, {
              color: this._getColor(entityId),
              opacity,
              interactive: false,
            })
          );
        }
      }
    }

    // DRAW entities
    for (const entity of allEntities) {
      const entityId = entity.entity;
      const stateObj = hass.states[entityId];
      if (!stateObj) {
        continue;
      }
      const title = computeStateName(stateObj);
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
        if (passive) {
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

        // create marker with the icon
        mapZones.push(
          Leaflet.marker([latitude, longitude], {
            icon: Leaflet.divIcon({
              html: iconHTML,
              iconSize: [24, 24],
              className: this._config!.dark_mode
                ? "dark"
                : this._config!.dark_mode === false
                ? "light"
                : "",
            }),
            interactive: false,
            title,
          })
        );

        // create circle around it
        mapZones.push(
          Leaflet.circle([latitude, longitude], {
            interactive: false,
            color: "#FF9800",
            radius,
          })
        );

        continue;
      }

      // DRAW ENTITY
      // create icon
      const entityName = title
        .split(" ")
        .map((part) => part[0])
        .join("")
        .substr(0, 3);

      // create market with the icon
      mapItems.push(
        Leaflet.marker([latitude, longitude], {
          icon: Leaflet.divIcon({
            // Leaflet clones this element before adding it to the map. This messes up
            // our Polymer object and we can't pass data through. Thus we hack like this.
            html: `
              <ha-entity-marker
                entity-id="${entityId}"
                entity-name="${entityName}"
                entity-picture="${entityPicture || ""}"
                entity-color="${this._getColor(entityId)}"
              ></ha-entity-marker>
            `,
            iconSize: [48, 48],
            className: "",
          }),
          title: computeStateName(stateObj),
        })
      );

      // create circle around if entity has accuracy
      if (gpsAccuracy) {
        mapItems.push(
          Leaflet.circle([latitude, longitude], {
            interactive: false,
            color: this._getColor(entityId),
            radius: gpsAccuracy,
          })
        );
      }
    }

    this._mapItems.forEach((marker) => map.addLayer(marker));
    this._mapZones.forEach((marker) => map.addLayer(marker));
    this._mapPaths.forEach((marker) => map.addLayer(marker));
  }

  private async _attachObserver(): Promise<void> {
    // Observe changes to map size and invalidate to prevent broken rendering

    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(this._debouncedResizeListener);
    }
    this._resizeObserver.observe(this);
  }

  private async _getHistory(): Promise<void> {
    this._date = new Date();

    if (!this._configEntities) {
      return;
    }

    const entityIds = this._configEntities!.map((entity) => entity.entity).join(
      ","
    );
    const endTime = new Date();
    const startTime = new Date();
    startTime.setHours(endTime.getHours() - this._config!.hours_to_show!);
    const skipInitialState = false;
    const significantChangesOnly = false;
    const minimalResponse = false;

    const stateHistory = await fetchRecent(
      this.hass,
      entityIds,
      startTime,
      endTime,
      skipInitialState,
      significantChangesOnly,
      minimalResponse
    );

    if (stateHistory.length < 1) {
      return;
    }

    this._history = stateHistory;
  }

  private _cleanupHistory() {
    if (!this._history) {
      return;
    }
    if (this._config!.hours_to_show! <= 0) {
      this._history = undefined;
    } else {
      // remove unused entities
      const configEntityIds = this._configEntities?.map(
        (configEntity) => configEntity.entity
      );
      this._history = this._history!.reduce(
        (accumulator: HassEntity[][], entityStates) => {
          const entityId = entityStates[0].entity_id;
          if (configEntityIds?.includes(entityId)) {
            accumulator.push(entityStates);
          }
          return accumulator;
        },
        []
      ) as HassEntity[][];
    }
  }

  static get styles(): CSSResult {
    return css`
      :host([ispanel][editMode]) ha-card {
        height: calc(100% - 51px);
      }

      ha-card {
        overflow: hidden;
        width: 100%;
        height: 100%;
      }

      #map {
        z-index: 0;
        border: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: inherit;
      }

      ha-icon-button {
        position: absolute;
        top: 75px;
        left: 3px;
        outline: none;
      }

      #root {
        position: relative;
      }

      :host([ispanel]) #root {
        height: 100%;
      }

      .dark {
        color: #ffffff;
      }

      .light {
        color: #000000;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card": HuiMapCard;
  }
}
