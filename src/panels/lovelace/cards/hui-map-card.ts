import "@polymer/paper-icon-button/paper-icon-button";
import { Layer, Marker, Circle, Map } from "leaflet";
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
  LeafletModuleType,
} from "../../../common/dom/setup-leaflet-map";
import computeStateDomain from "../../../common/entity/compute_state_domain";
import computeStateName from "../../../common/entity/compute_state_name";
import debounce from "../../../common/util/debounce";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import { HomeAssistant } from "../../../types";
import computeDomain from "../../../common/entity/compute_domain";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";

export interface MapCardConfig extends LovelaceCardConfig {
  title: string;
  aspect_ratio: string;
  default_zoom?: number;
  entities?: Array<EntityConfig | string>;
  geo_location_sources?: string[];
}

@customElement("hui-map-card")
class HuiMapCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import(/* webpackChunkName: "hui-map-card-editor" */ "../editor/config-elements/hui-map-card-editor");
    return document.createElement("hui-map-card-editor");
  }

  public static getStubConfig() {
    return { entities: [] };
  }

  @property() public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public isPanel = false;

  @property()
  private _config?: MapCardConfig;
  private _configEntities?: EntityConfig[];
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
  private _connected = false;

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
  }

  public getCardSize(): number {
    if (!this._config) {
      return 3;
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
      this._attachObserver();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this._leafletMap) {
      this._leafletMap.remove();
    }

    if (this._resizeObserver) {
      this._resizeObserver.unobserve(this._mapEl);
    } else {
      window.removeEventListener("resize", this._debouncedResizeListener);
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }
    return html`
      <ha-card id="card" .header=${this._config.title}>
        <div id="root">
          <div id="map"></div>
          <paper-icon-button
            @click=${this._fitMap}
            icon="hass:image-filter-center-focus"
            title="Reset focus"
          ></paper-icon-button>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this.loadMap();
    const root = this.shadowRoot!.getElementById("root");

    if (!this._config || this.isPanel || !root) {
      return;
    }

    if (this._connected) {
      this._attachObserver();
    }

    const ratio = parseAspectRatio(this._config.aspect_ratio);

    root.style.paddingBottom =
      ratio && ratio.w > 0 && ratio.h > 0
        ? `${((100 * ratio.h) / ratio.w).toFixed(2)}%`
        : (root.style.paddingBottom = "100%");
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass")) {
      this._drawEntities();
    }
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.getElementById("map") as HTMLDivElement;
  }

  private async loadMap(): Promise<void> {
    [this._leafletMap, this.Leaflet] = await setupLeafletMap(this._mapEl);
    this._drawEntities();
    this._leafletMap.invalidateSize();
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

    const bounds = this.Leaflet.latLngBounds(
      this._mapItems ? this._mapItems.map((item) => item.getLatLng()) : []
    );
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

        // create marker with the icon
        mapItems.push(
          Leaflet.marker([latitude, longitude], {
            icon: Leaflet.divIcon({
              html: icon ? `<ha-icon icon="${icon}"></ha-icon>` : title,
              iconSize: [24, 24],
              className: "",
            }),
            interactive: false,
            title,
          })
        );

        // create circle around it
        mapItems.push(
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
            color: "#0288D1",
            radius: gpsAccuracy,
          })
        );
      }
    }

    this._mapItems.forEach((marker) => map.addLayer(marker));
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

  static get styles(): CSSResult {
    return css`
      :host([ispanel]) ha-card {
        left: 0;
        top: 0;
        width: 100%;
        /**
       * In panel mode we want a full height map. Since parent #view
       * only sets min-height, we need absolute positioning here
       */
        height: 100%;
        position: absolute;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card": HuiMapCard;
  }
}
