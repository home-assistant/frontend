import "@polymer/paper-icon-button/paper-icon-button";
import {
  Layer,
  Marker,
  Circle,
  Map,
  LatLngExpression,
  CircleMarker,
  Polyline,
  LatLngTuple,
} from "leaflet";
import {
  LitElement,
  TemplateResult,
  css,
  html,
  property,
  PropertyValues,
  CSSResult,
  customElement,
} from "lit-element";

import "../../map/ha-entity-marker";

import {
  setupLeafletMap,
  createTileLayer,
  LeafletModuleType,
} from "../../../common/dom/setup-leaflet-map";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { debounce } from "../../../common/util/debounce";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import { computeDomain } from "../../../common/entity/compute_domain";

import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EntityConfig } from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";
import { MapCardConfig } from "./types";
import { classMap } from "lit-html/directives/class-map";
import { findEntities } from "../common/find-entites";

import { getRecentWithCache, CacheConfig } from "../../../data/cached-history";
import "../../../data/ha-state-history-data";

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

  @property() public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public isPanel = false;

  @property()
  private _stateHistory?: any;

  @property()
  private _locationHistory?: any;

  @property()
  private _config?: MapCardConfig;
  private _configEntities?: EntityConfig[];
  private _cacheConfig?: CacheConfig;
  private _configHistoryEntities?: EntityConfig[];

  // tslint:disable-next-line
  private Leaflet?: LeafletModuleType;
  private _leafletMap?: Map;
  // @ts-ignore
  private _resizeObserver?: ResizeObserver;
  private _debouncedResizeListener = debounce(
    () => {
      if (!this._leafletMap) {
        return;
      }
      this._leafletMap.invalidateSize();
    },
    100,
    false
  );
  private _mapItems: Array<Marker | Circle> = [];
  private _mapZones: Array<Marker | Circle> = [];
  private _mapHistories: Array<Polyline | CircleMarker> = [];
  private _connected = false;

  public setConfig(config: MapCardConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    if (
      !config.entities &&
      !config.geo_location_sources &&
      !config.history_entities
    ) {
      throw new Error(
        "Either entities, hsitory_entities or geo_location_sources must be defined"
      );
    }
    if (config.entities && !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }
    if (config.history_entities && !Array.isArray(config.history_entities)) {
      throw new Error("History entities need to be an array");
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
    this._configHistoryEntities = config.history_entities
      ? processConfigEntities(config.history_entities)
      : [];

    // default history to 24 hours, extend to dynamic hours_to_show in a later version
    this._cacheConfig = {
      cacheKey: this._configHistoryEntities
        .map((entityObj) => entityObj.entity)
        .join(),
      hoursToShow: this._config.hours_to_show || 24,
      refresh: 0,
    };
  }

  public getCardSize(): number {
    if (!this._config?.aspect_ratio) {
      return 5;
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
    this._connected = true;
    if (this.hasUpdated) {
      this.loadMap();
      this._attachObserver();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._connected = false;

    if (this._leafletMap) {
      this._leafletMap.remove();
      this._leafletMap = undefined;
      this.Leaflet = undefined;
    }

    if (this._resizeObserver) {
      this._resizeObserver.unobserve(this._mapEl);
    } else {
      window.removeEventListener("resize", this._debouncedResizeListener);
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
          <paper-icon-button
            @click=${this._fitMap}
            tabindex="0"
            icon="hass:image-filter-center-focus"
            title="Reset focus"
          ></paper-icon-button>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps) {
    if (!changedProps.has("hass") || changedProps.size > 1) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldLocationHistory = changedProps.get("_locationHistory");

    if (!oldHass || !this._configEntities || !this._configHistoryEntities) {
      return true;
    }

    // Check if any state has changed
    for (const entity of this._configEntities) {
      if (oldHass.states[entity.entity] !== this.hass!.states[entity.entity]) {
        return true;
      }
      if (oldLocationHistory !== this._locationHistory) {
        return true;
      }
    }

    return false;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._getStateHistory();
    this.loadMap();
    const root = this.shadowRoot!.getElementById("root");

    if (!this._config || this.isPanel || !root) {
      return;
    }

    if (this._connected) {
      this._attachObserver();
    }

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
    if (changedProps.has("hass")) {
      this._getStateHistory();
    }
    if (changedProps.has("_stateHistory")) {
      this._updateLocationHistory();
    }
    if (
      changedProps.has("hass") ||
      changedProps.has("_stateHistory") ||
      changedProps.has("_locationHistory")
    ) {
      this._drawEntities();
      this._fitMap();
    }
    if (
      changedProps.has("_config") &&
      changedProps.get("_config") !== undefined
    ) {
      this.updateMap(changedProps.get("_config") as MapCardConfig);
    }
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.getElementById("map") as HTMLDivElement;
  }

  private async loadMap(): Promise<void> {
    [this._leafletMap, this.Leaflet] = await setupLeafletMap(
      this._mapEl,
      this._config !== undefined ? this._config.dark_mode === true : false
    );
    this._drawEntities();
    this._leafletMap.invalidateSize();
    this._fitMap();
  }

  private updateMap(oldConfig: MapCardConfig): void {
    const map = this._leafletMap;
    const config = this._config;
    const Leaflet = this.Leaflet;
    if (!map || !config || !Leaflet) {
      return;
    }
    if (config.dark_mode !== oldConfig.dark_mode) {
      createTileLayer(Leaflet, config.dark_mode === true).addTo(map);
    }
    if (
      config.entities !== oldConfig.entities ||
      config.geo_location_sources !== oldConfig.geo_location_sources ||
      config.history_entities !== oldConfig.history_entities
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

    if (this._mapHistories) {
      this._mapHistories.forEach((marker) => marker.remove());
    }
    const mapHistories: Layer[] = (this._mapHistories = []);

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
    if (config.history_entities && this._stateHistory?.timeline) {
      const colors = [
        "#0288d1",
        "#581845",
        "#99d037 ",
        "#FFC300",
        "#1c609c",
        "#C70039",
      ];
      let colorIndex = 0;

      const historyEntities = this._stateHistory.timeline;
      for (const entity of historyEntities) {
        const entityId = entity.entity_id;
        const historyLog = entity.data;
        if (!history || history.length <= 1) {
          continue;
        }

        const path = [] as LatLngExpression[];
        for (const stateObj of historyLog) {
          const address = stateObj.state;
          if (address in this._locationHistory) {
            path.push(this._locationHistory[address]);
          }
        }

        // if there is a device tracker for the geocoded location use this as newst path point
        const deviceTrackerID = entityId
          .replace(/^sensor/, "device_tracker")
          .replace(/_geocoded_location$/, "");
        const trackerObj = hass.states[deviceTrackerID];
        if (
          trackerObj?.attributes.latitude &&
          trackerObj?.attributes.longitude
        ) {
          allEntities.push({
            entity: deviceTrackerID,
            color: colors[colorIndex],
          });
          const currentLat = trackerObj.attributes.latitude;
          const currentLng = trackerObj.attributes.longitude;
          path.pop();
          path.push([currentLat, currentLng] as LatLngTuple);
        }

        // DRAW history path
        for (
          let markerIndex = 0;
          markerIndex < path.length - 1;
          markerIndex++
        ) {
          const opacityStep = 1 / path.length;
          const opacity = 2 * opacityStep + markerIndex * opacityStep;
          // DRAW history markers
          mapHistories.push(
            Leaflet.circleMarker(path[markerIndex], {
              radius: 5,
              color: colors[colorIndex],
              opacity,
              interactive: false,
            })
          );

          // DRAW history path lines
          const line = [path[markerIndex], path[markerIndex + 1]];
          mapHistories.push(
            Leaflet.polyline(line, {
              color: colors[colorIndex],
              opacity,
              interactive: false,
            })
          );
        }
        colorIndex = (colorIndex + 1) % colors.length;
      }
    }

    // DRAW entities
    for (const entity of allEntities) {
      const entityId = entity.entity;
      const color = entity.color;
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
              className: this._config!.dark_mode === true ? "dark" : "light",
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
            color: color || "#0288D1",
            radius: gpsAccuracy,
          })
        );
      }
    }

    this._mapItems.forEach((marker) => map.addLayer(marker));
    this._mapZones.forEach((marker) => map.addLayer(marker));
    this._mapHistories.forEach((marker) => map.addLayer(marker));
  }

  private _attachObserver(): void {
    // Observe changes to map size and invalidate to prevent broken rendering
    // Uses ResizeObserver in Chrome, otherwise window resize event

    // @ts-ignore
    if (typeof ResizeObserver === "function") {
      // @ts-ignore
      this._resizeObserver = new ResizeObserver(() =>
        this._debouncedResizeListener()
      );
      this._resizeObserver.observe(this._mapEl);
    } else {
      window.addEventListener("resize", this._debouncedResizeListener);
    }
  }

  private _getStateHistory(): void {
    getRecentWithCache(
      this.hass!,
      this._cacheConfig!.cacheKey,
      this._cacheConfig!,
      this.hass!.localize,
      this.hass!.language
    )
      .then((stateHistory) => {
        this._stateHistory = {
          ...this._stateHistory,
          ...stateHistory,
        };
      })
      .then(() => this._updateLocationHistory());
  }

  private _updateLocationHistory(): void {
    if (!this._locationHistory) {
      this._locationHistory = {};
    }

    for (const entity of this._stateHistory?.timeline) {
      for (const stateObj of entity.data) {
        if (stateObj.state === "Unknown") {
          continue;
        }

        const address = stateObj.state;
        if (this._locationHistory[address]) {
          continue;
        }
        this._fetchLocationByAddress(address).then((location) => {
          if (location !== undefined) {
            this._locationHistory = {
              ...this._locationHistory,
              [address]: location,
            };
          }
        });
      }
    }
  }

  private async _fetchLocationByAddress(
    address: string
  ): Promise<LatLngTuple | undefined> {
    const baseUrl =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=";
    const searchQuery = address.split("\n").join(" ");
    const sanitizedUri = encodeURI(baseUrl.concat(searchQuery));

    // we need to wait on every history call
    // because we do use a free api and do not want get banned
    await this._delay(1000);
    if (!this._locationHistory[address]) {
      const request = new Request(sanitizedUri);
      return fetch(request, { mode: "cors" })
        .then((res) => res.json())
        .then((result) => {
          let location;
          if (result.length >= 1) {
            location = [result[0].lat, result[0].lon] as LatLngTuple;
          }
          return location;
        });
    }
  }

  private _delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static get styles(): CSSResult {
    return css`
      :host([ispanel]) ha-card {
        width: 100%;
        height: 100%;
      }

      ha-card {
        overflow: hidden;
      }

      #map {
        z-index: 0;
        border: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #fafaf8;
      }

      #map.dark {
        background: #090909;
      }

      paper-icon-button {
        position: absolute;
        top: 75px;
        left: 7px;
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
