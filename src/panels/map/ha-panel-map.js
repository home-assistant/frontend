import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import Leaflet from "leaflet";

import "../../components/ha-menu-button";
import "../../components/ha-icon";

import "./ha-entity-marker";

import computeStateDomain from "../../common/entity/compute_state_domain";
import computeStateName from "../../common/entity/compute_state_name";
import LocalizeMixin from "../../mixins/localize-mixin";
import setupLeafletMap from "../../common/dom/setup-leaflet-map";

Leaflet.Icon.Default.imagePath = "/static/images/leaflet";

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
    </style>

    <app-toolbar>
      <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
      <div main-title>[[localize('panel.map')]]</div>
    </app-toolbar>

    <div id='map'></div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "drawEntities",
      },

      narrow: {
        type: Boolean,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    var map = (this._map = setupLeafletMap(this.$.map));

    this.drawEntities(this.hass);

    setTimeout(() => {
      map.invalidateSize();
      this.fitMap();
    }, 1);
  }

  disconnectedCallback() {
    if (this._map) {
      this._map.remove();
    }
  }

  fitMap() {
    var bounds;

    if (this._mapItems.length === 0) {
      this._map.setView(
        new Leaflet.LatLng(
          this.hass.config.latitude,
          this.hass.config.longitude
        ),
        14
      );
    } else {
      bounds = new Leaflet.latLngBounds(
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

    Object.keys(hass.states).forEach(function(entityId) {
      var entity = hass.states[entityId];
      var title = computeStateName(entity);

      if (
        (entity.attributes.hidden && computeStateDomain(entity) !== "zone") ||
        entity.state === "home" ||
        !("latitude" in entity.attributes) ||
        !("longitude" in entity.attributes)
      ) {
        return;
      }

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
          iconHTML = title;
        }

        icon = Leaflet.divIcon({
          html: iconHTML,
          iconSize: [24, 24],
          className: "",
        });

        // create market with the icon
        mapItems.push(
          Leaflet.marker(
            [entity.attributes.latitude, entity.attributes.longitude],
            {
              icon: icon,
              interactive: false,
              title: title,
            }
          ).addTo(map)
        );

        // create circle around it
        mapItems.push(
          Leaflet.circle(
            [entity.attributes.latitude, entity.attributes.longitude],
            {
              interactive: false,
              color: "#FF9800",
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
      icon = Leaflet.divIcon({
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
        Leaflet.marker(
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
          Leaflet.circle(
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
