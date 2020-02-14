import "@polymer/paper-icon-button/paper-icon-button";
import { Circle, Layer, Map, Marker } from "leaflet";
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
import {
  LeafletModuleType,
  setupLeafletMap,
} from "../../common/dom/setup-leaflet-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { debounce } from "../../common/util/debounce";
import { HomeAssistant } from "../../types";
import "../../panels/map/ha-entity-marker";

@customElement("ha-map")
class HaMap extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public entities?: string[];
  @property() public darkMode = false;
  @property() public zoom?: number;
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
  private _connected = false;

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
    if (!this.entities) {
      return html``;
    }
    return html`
      <div id="map"></div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this.loadMap();

    if (this._connected) {
      this._attachObserver();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass")) {
      this._drawEntities();
      this._fitMap();
    }
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.getElementById("map") as HTMLDivElement;
  }

  private async loadMap(): Promise<void> {
    [this._leafletMap, this.Leaflet] = await setupLeafletMap(
      this._mapEl,
      this.darkMode
    );
    this._drawEntities();
    this._leafletMap.invalidateSize();
    this._fitMap();
  }

  private _fitMap(): void {
    if (!this._leafletMap || !this.Leaflet || !this.hass) {
      return;
    }
    if (this._mapItems.length === 0) {
      this._leafletMap.setView(
        new this.Leaflet.LatLng(
          this.hass.config.latitude,
          this.hass.config.longitude
        ),
        this.zoom || 14
      );
      return;
    }

    const bounds = this.Leaflet.latLngBounds(
      this._mapItems ? this._mapItems.map((item) => item.getLatLng()) : []
    );
    this._leafletMap.fitBounds(bounds.pad(0.5));

    if (this.zoom && this._leafletMap.getZoom() > this.zoom) {
      this._leafletMap.setZoom(this.zoom);
    }
  }

  private _drawEntities(): void {
    const hass = this.hass;
    const map = this._leafletMap;
    const Leaflet = this.Leaflet;
    if (!hass || !map || !Leaflet) {
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

    const allEntities = this.entities!.concat();

    for (const entity of allEntities) {
      const entityId = entity;
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
              className: this.darkMode ? "dark" : "light",
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
            color: "#0288D1",
            radius: gpsAccuracy,
          })
        );
      }
    }

    this._mapItems.forEach((marker) => map.addLayer(marker));
    this._mapZones.forEach((marker) => map.addLayer(marker));
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
      :host {
        display: block;
        height: 300px;
      }
      #map {
        height: 100%;
      }
      #map.dark {
        background: #090909;
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
    "ha-map": HaMap;
  }
}
