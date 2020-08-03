import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import {
  setupLeafletMap,
  replaceTileLayer,
} from "../../common/dom/setup-leaflet-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { navigate } from "../../common/navigate";
import "../../components/ha-icon";
import "../../components/ha-menu-button";
import { defaultRadiusColor } from "../../data/zone";
import LocalizeMixin from "../../mixins/localize-mixin";
import "./ha-entity-marker";
import "../../styles/polymer-ha-style";
import "../../layouts/ha-app-layout";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelMap extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        #map {
          height: calc(100vh - 64px);
          width: 100%;
          z-index: 0;
          background: inherit;
        }

        .icon {
          color: var(--primary-text-color);
        }
      </style>

      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title>[[localize('panel.map')]]</div>
            <template is="dom-if" if="[[computeShowEditZone(hass)]]">
              <ha-icon-button
                icon="hass:pencil"
                on-click="openZonesEditor"
              ></ha-icon-button>
            </template>
          </app-toolbar>
        </app-header>
        <div id="map"></div>
      </ha-app-layout>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "drawEntities",
      },
      narrow: Boolean,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadMap();
  }

  async loadMap() {
    this._darkMode = this.hass.themes.darkMode;
    [this._map, this.Leaflet, this._tileLayer] = await setupLeafletMap(
      this.$.map,
      this._darkMode
    );
    this.drawEntities(this.hass);
    this._map.invalidateSize();
    this.fitMap();
  }

  disconnectedCallback() {
    if (this._map) {
      this._map.remove();
    }
  }

  computeShowEditZone(hass) {
    return !__DEMO__ && hass.user.is_admin;
  }

  openZonesEditor() {
    navigate(this, "/config/zone");
  }

  fitMap() {
    let bounds;

    if (this._mapItems.length === 0) {
      this._map.setView(
        new this.Leaflet.LatLng(
          this.hass.config.latitude,
          this.hass.config.longitude
        ),
        14
      );
    } else {
      bounds = new this.Leaflet.latLngBounds(
        this._mapItems.map((item) => item.getLatLng())
      );
      this._map.fitBounds(bounds.pad(0.5));
    }
  }

  drawEntities(hass) {
    /* eslint-disable vars-on-top */
    const map = this._map;
    if (!map) return;

    if (this._darkMode !== this.hass.themes.darkMode) {
      this._darkMode = this.hass.themes.darkMode;
      this._tileLayer = replaceTileLayer(
        this.Leaflet,
        map,
        this._tileLayer,
        this.hass.themes.darkMode
      );
    }

    if (this._mapItems) {
      this._mapItems.forEach(function (marker) {
        marker.remove();
      });
    }
    const mapItems = (this._mapItems = []);

    if (this._mapZones) {
      this._mapZones.forEach(function (marker) {
        marker.remove();
      });
    }
    const mapZones = (this._mapZones = []);

    Object.keys(hass.states).forEach((entityId) => {
      const entity = hass.states[entityId];

      if (
        entity.state === "home" ||
        !("latitude" in entity.attributes) ||
        !("longitude" in entity.attributes)
      ) {
        return;
      }

      const title = computeStateName(entity);
      let icon;

      if (computeStateDomain(entity) === "zone") {
        // DRAW ZONE
        if (entity.attributes.passive) return;

        // create icon
        let iconHTML = "";
        if (entity.attributes.icon) {
          const el = document.createElement("ha-icon");
          el.setAttribute("icon", entity.attributes.icon);
          iconHTML = el.outerHTML;
        } else {
          const el = document.createElement("span");
          el.innerHTML = title;
          iconHTML = el.outerHTML;
        }

        icon = this.Leaflet.divIcon({
          html: iconHTML,
          iconSize: [24, 24],
          className: "icon",
        });

        // create marker with the icon
        mapZones.push(
          this.Leaflet.marker(
            [entity.attributes.latitude, entity.attributes.longitude],
            {
              icon: icon,
              interactive: false,
              title: title,
            }
          ).addTo(map)
        );

        // create circle around it
        mapZones.push(
          this.Leaflet.circle(
            [entity.attributes.latitude, entity.attributes.longitude],
            {
              interactive: false,
              color: defaultRadiusColor,
              radius: entity.attributes.radius,
            }
          ).addTo(map)
        );

        return;
      }

      // DRAW ENTITY
      // create icon
      const entityPicture = entity.attributes.entity_picture || "";
      const entityName = title
        .split(" ")
        .map(function (part) {
          return part.substr(0, 1);
        })
        .join("");
      /* Leaflet clones this element before adding it to the map. This messes up
         our Polymer object and we can't pass data through. Thus we hack like this. */
      icon = this.Leaflet.divIcon({
        html:
          "<ha-entity-marker entity-id='" +
          entity.entity_id +
          "' entity-name='" +
          entityName +
          "' entity-picture='" +
          entityPicture +
          "'></ha-entity-marker>",
        iconSize: [45, 45],
        className: "",
      });

      // create market with the icon
      mapItems.push(
        this.Leaflet.marker(
          [entity.attributes.latitude, entity.attributes.longitude],
          {
            icon: icon,
            title: computeStateName(entity),
          }
        ).addTo(map)
      );

      // create circle around if entity has accuracy
      if (entity.attributes.gps_accuracy) {
        mapItems.push(
          this.Leaflet.circle(
            [entity.attributes.latitude, entity.attributes.longitude],
            {
              interactive: false,
              color: "#0288D1",
              radius: entity.attributes.gps_accuracy,
            }
          ).addTo(map)
        );
      }
    });
  }
}

customElements.define("ha-panel-map", HaPanelMap);
