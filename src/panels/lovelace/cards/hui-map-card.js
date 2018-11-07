import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-icon-button/paper-icon-button";
import Leaflet from "leaflet";

import "../../map/ha-entity-marker";

import setupLeafletMap from "../../../common/dom/setup-leaflet-map";
import processConfigEntities from "../common/process-config-entities";
import computeStateDomain from "../../../common/entity/compute_state_domain";
import computeStateName from "../../../common/entity/compute_state_name";
import debounce from "../../../common/util/debounce";

Leaflet.Icon.Default.imagePath = "/static/images/leaflet";

class HuiMapCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host([is-panel]) ha-card {
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

        :host([is-panel]) #root {
          height: 100%;
        }
      </style>

      <ha-card id="card" header="[[_config.title]]">
        <div id="root">
          <div id="map"></div>
          <paper-icon-button
            on-click="_fitMap"
            icon="hass:image-filter-center-focus"
            title="Reset focus"
          ></paper-icon-button>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_drawEntities",
      },
      _config: Object,
      isPanel: {
        type: Boolean,
        reflectToAttribute: true,
      },
    };
  }

  constructor() {
    super();
    this._debouncedResizeListener = debounce(this._resetMap.bind(this), 100);
  }

  ready() {
    super.ready();

    if (!this._config || this.isPanel) {
      return;
    }

    this.$.root.style.paddingTop = this._config.aspect_ratio || "100%";
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._configEntities = processConfigEntities(config.entities);
    this._config = config;
  }

  getCardSize() {
    let ar = this._config.aspect_ratio || "100%";
    ar = ar.substr(0, ar.length - 1);
    return 1 + Math.floor(ar / 25) || 3;
  }

  connectedCallback() {
    super.connectedCallback();

    // Observe changes to map size and invalidate to prevent broken rendering
    // Uses ResizeObserver in Chrome, otherwise window resize event
    if (typeof ResizeObserver === "function") {
      this._resizeObserver = new ResizeObserver(() =>
        this._debouncedResizeListener()
      );
      this._resizeObserver.observe(this.$.map);
    } else {
      window.addEventListener("resize", this._debouncedResizeListener);
    }

    this._map = setupLeafletMap(this.$.map);
    this._drawEntities(this.hass);

    setTimeout(() => {
      this._resetMap();
      this._fitMap();
    }, 1);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._map) {
      this._map.remove();
    }

    if (this._resizeObserver) {
      this._resizeObserver.unobserve(this.$.map);
    } else {
      window.removeEventListener("resize", this._debouncedResizeListener);
    }
  }

  _resetMap() {
    if (!this._map) {
      return;
    }
    this._map.invalidateSize();
  }

  _fitMap() {
    const zoom = this._config.default_zoom;
    if (this._mapItems.length === 0) {
      this._map.setView(
        new Leaflet.LatLng(
          this.hass.config.latitude,
          this.hass.config.longitude
        ),
        zoom || 14
      );
      return;
    }

    const bounds = new Leaflet.latLngBounds(
      this._mapItems.map((item) => item.getLatLng())
    );
    this._map.fitBounds(bounds.pad(0.5));

    if (zoom && this._map.getZoom() > zoom) {
      this._map.setZoom(zoom);
    }
  }

  _drawEntities(hass) {
    const map = this._map;
    if (!map) {
      return;
    }

    if (this._mapItems) {
      this._mapItems.forEach((marker) => marker.remove());
    }
    const mapItems = (this._mapItems = []);

    this._configEntities.forEach((entity) => {
      const entityId = entity.entity;
      if (!(entityId in hass.states)) {
        return;
      }
      const stateObj = hass.states[entityId];
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
        return;
      }

      let markerIcon;
      let iconHTML;
      let el;

      if (computeStateDomain(stateObj) === "zone") {
        // DRAW ZONE
        if (passive) return;

        // create icon
        if (icon) {
          el = document.createElement("ha-icon");
          el.setAttribute("icon", icon);
          iconHTML = el.outerHTML;
        } else {
          iconHTML = title;
        }

        markerIcon = Leaflet.divIcon({
          html: iconHTML,
          iconSize: [24, 24],
          className: "",
        });

        // create market with the icon
        mapItems.push(
          Leaflet.marker([latitude, longitude], {
            icon: markerIcon,
            interactive: false,
            title: title,
          }).addTo(map)
        );

        // create circle around it
        mapItems.push(
          Leaflet.circle([latitude, longitude], {
            interactive: false,
            color: "#FF9800",
            radius: radius,
          }).addTo(map)
        );

        return;
      }

      // DRAW ENTITY
      // create icon
      const entityName = title
        .split(" ")
        .map((part) => part[0])
        .join("")
        .substr(0, 3);

      el = document.createElement("ha-entity-marker");
      el.setAttribute("entity-id", entityId);
      el.setAttribute("entity-name", entityName);
      el.setAttribute("entity-picture", entityPicture || "");

      /* Leaflet clones this element before adding it to the map. This messes up
         our Polymer object and we can't pass data through. Thus we hack like this. */
      markerIcon = Leaflet.divIcon({
        html: el.outerHTML,
        iconSize: [48, 48],
        className: "",
      });

      // create market with the icon
      mapItems.push(
        Leaflet.marker([latitude, longitude], {
          icon: markerIcon,
          title: computeStateName(stateObj),
        }).addTo(map)
      );

      // create circle around if entity has accuracy
      if (gpsAccuracy) {
        mapItems.push(
          Leaflet.circle([latitude, longitude], {
            interactive: false,
            color: "#0288D1",
            radius: gpsAccuracy,
          }).addTo(map)
        );
      }
    });
  }
}

customElements.define("hui-map-card", HuiMapCard);
