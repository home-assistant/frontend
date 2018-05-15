import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import Leaflet from 'leaflet';

import '../../src/components/ha-menu-button.js';
import '../../src/util/hass-mixins.js';
import './ha-entity-marker.js';

Leaflet.Icon.Default.imagePath = '/static/images/leaflet';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaPanelMap extends window.hassMixins.LocalizeMixin(PolymerElement) {
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
  static get is() { return 'ha-panel-map'; }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: 'drawEntities',
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
    var map = this._map = Leaflet.map(this.$.map);
    var style = document.createElement('link');
    style.setAttribute('href', __DEV__ ?
      '/home-assistant-polymer/bower_components/leaflet/dist/leaflet.css' :
      '/static/images/leaflet/leaflet.css');
    style.setAttribute('rel', 'stylesheet');
    this.$.map.parentNode.appendChild(style);
    map.setView([51.505, -0.09], 13);
    Leaflet.tileLayer(
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
        maxZoom: 18,
      }
    ).addTo(map);

    this.drawEntities(this.hass);

    setTimeout(() => {
      map.invalidateSize();
      this.fitMap();
    }, 1);
  }

  fitMap() {
    var bounds;

    if (this._mapItems.length === 0) {
      this._map.setView(
        new Leaflet.LatLng(this.hass.config.core.latitude, this.hass.config.core.longitude),
        14
      );
    } else {
      bounds = new Leaflet.latLngBounds(this._mapItems.map(item => item.getLatLng()));
      this._map.fitBounds(bounds.pad(0.5));
    }
  }

  drawEntities(hass) {
    /* eslint-disable vars-on-top */
    var map = this._map;
    if (!map) return;

    if (this._mapItems) {
      this._mapItems.forEach(function (marker) { marker.remove(); });
    }
    var mapItems = this._mapItems = [];

    Object.keys(hass.states).forEach(function (entityId) {
      var entity = hass.states[entityId];
      var title = window.hassUtil.computeStateName(entity);

      if ((entity.attributes.hidden &&
           window.hassUtil.computeDomain(entity) !== 'zone') ||
          entity.state === 'home' ||
          !('latitude' in entity.attributes) ||
          !('longitude' in entity.attributes)) {
        return;
      }

      var icon;

      if (window.hassUtil.computeDomain(entity) === 'zone') {
        // DRAW ZONE
        if (entity.attributes.passive) return;

        // create icon
        var iconHTML = '';
        if (entity.attributes.icon) {
          iconHTML = (
            "<iron-icon icon='" + entity.attributes.icon + "'></iron-icon>");
        } else {
          iconHTML = title;
        }

        icon = Leaflet.divIcon({
          html: iconHTML,
          iconSize: [24, 24],
          className: '',
        });

        // create market with the icon
        mapItems.push(Leaflet.marker(
          [entity.attributes.latitude, entity.attributes.longitude],
          {
            icon: icon,
            interactive: false,
            title: title,
          }
        ).addTo(map));

        // create circle around it
        mapItems.push(Leaflet.circle(
          [entity.attributes.latitude, entity.attributes.longitude],
          {
            interactive: false,
            color: '#FF9800',
            radius: entity.attributes.radius,
          }
        ).addTo(map));

        return;
      }

      // DRAW ENTITY
      // create icon
      var entityPicture = entity.attributes.entity_picture || '';
      var entityName = title.split(' ').map(function (part) { return part.substr(0, 1); }).join('');
      /* Leaflet clones this element before adding it to the map. This messes up
         our Polymer object and we can't pass data through. Thus we hack like this. */
      icon = Leaflet.divIcon({
        html: "<ha-entity-marker entity-id='" + entity.entity_id + "' entity-name='" + entityName + "' entity-picture='" + entityPicture + "'></ha-entity-marker>",
        iconSize: [45, 45],
        className: '',
      });

      // create market with the icon
      mapItems.push(Leaflet.marker(
        [entity.attributes.latitude, entity.attributes.longitude],
        {
          icon: icon,
          title: window.hassUtil.computeStateName(entity),
        }
      ).addTo(map));

      // create circle around if entity has accuracy
      if (entity.attributes.gps_accuracy) {
        mapItems.push(Leaflet.circle(
          [entity.attributes.latitude, entity.attributes.longitude],
          {
            interactive: false,
            color: '#0288D1',
            radius: entity.attributes.gps_accuracy,
          }
        ).addTo(map));
      }
    });
  }
}

customElements.define(HaPanelMap.is, HaPanelMap);
