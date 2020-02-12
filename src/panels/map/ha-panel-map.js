import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-menu-button";
import "../../components/ha-icon";
import { navigate } from "../../common/navigate";

import "./ha-entity-marker";

import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import LocalizeMixin from "../../mixins/localize-mixin";
import { setupLeafletMap } from "../../common/dom/setup-leaflet-map";
import { defaultRadiusColor } from "../../data/zone";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelMap extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        #map {
          height: calc(100% - 64px);
          width: 100%;
          z-index: 0;
        }

        .light {
          color: #000000;
        }
      </style>

      <app-toolbar>
        <ha-menu-button hass="[[hass]]" narrow="[[narrow]]"></ha-menu-button>
        <div main-title>[[localize('panel.map')]]</div>
        <template is="dom-if" if="[[computeShowEditZone(hass)]]">
          <paper-icon-button
            icon="hass:pencil"
            on-click="openZonesEditor"
          ></paper-icon-button>
        </template>
      </app-toolbar>

      <div id="map"></div>
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
    [this._map, this.Leaflet] = await setupLeafletMap(this.$.map);
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
    var bounds;

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
    var map = this._map;
    if (!map) return;

    if (this._mapItems) {
      this._mapItems.forEach(function(marker) {
        marker.remove();
      });
    }
    var mapItems = (this._mapItems = []);

    if (this._mapZones) {
      this._mapZones.forEach(function(marker) {
        marker.remove();
      });
    }
    var mapZones = (this._mapZones = []);

    Object.keys(hass.states).forEach((entityId) => {
      var entity = hass.states[entityId];

      if (
        (entity.attributes.hidden && computeStateDomain(entity) !== "zone") ||
        entity.state === "home" ||
        !("latitude" in entity.attributes) ||
        !("longitude" in entity.attributes)
      ) {
        return;
      }

      var title = computeStateName(entity);
      var icon;

      if (computeStateDomain(entity) === "zone") {
        // DRAW ZONE
        if (entity.attributes.passive) return;

        // create icon
        var iconHTML = "";
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
          className: "light",
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
      var entityPicture = entity.attributes.entity_picture || "";
      var entityName = title
        .split(" ")
        .map(function(part) {
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
