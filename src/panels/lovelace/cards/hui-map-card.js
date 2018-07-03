import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import Leaflet from 'leaflet';

import '../../map/ha-entity-marker.js';

import processConfigEntities from '../common/process-config-entities';
import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import computeStateName from '../../../common/entity/compute_state_name.js';

Leaflet.Icon.Default.imagePath = '/static/images/leaflet';

class HuiMapCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        ha-card {
          height: 325px;
          position: relative;
        }
        
        ha-card.panel {
          height: 100%;
        }
        
        #map {
          width: 100%;
          z-index: 0;
        }
        
        #map.with-header {
          height: calc(100% - 72px);
        }
        
        #map.no-header {
          height: 100%;
        }
      </style>
      
      <ha-card id="card" header="[[_config.title]]" class$="[[_getCardClass(isPanel)]]">
        <div id="map" class$="[[_getMapClass(_config)]]"></div>
      </ha-card>

    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object
    };
  }

  ready() {
    super.ready();

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    new ResizeObserver(() => this._resetMap()).observe(this.$.map);
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Error in card configuration.');
    }

    this._config = config;
    this._configEntities = processConfigEntities(config.entities);
  }

  getCardSize() {
    return 4;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._map) {
      this._map = Leaflet.map(this.$.map);
    }
    const style = document.createElement('link');
    style.setAttribute('href', '/static/images/leaflet/leaflet.css');
    style.setAttribute('rel', 'stylesheet');
    this.$.map.parentNode.appendChild(style);
    this._map.setView([51.505, -0.09], 13);
    Leaflet.tileLayer(
      `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${Leaflet.Browser.retina ? '@2x.png' : '.png'}`,
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 20,
      }
    ).addTo(this._map);

    this._drawEntities(this.hass);

    setTimeout(() => {
      this._resetMap();
      this._fitMap();
    }, 1);
  }

  _getCardClass(isPanel) {
    return isPanel ? 'panel' : '';
  }

  _getMapClass(config) {
    return config.title ? 'with-header' : 'no-header';
  }

  _resetMap() {
    if (!this._map) {
      return;
    }
    this._map.invalidateSize();
  }

  _fitMap() {
    if (this._mapItems.length === 0) {
      this._map.setView(
        new Leaflet.LatLng(this.hass.config.core.latitude, this.hass.config.core.longitude),
        14
      );
    } else {
      const bounds = new Leaflet.latLngBounds(this._mapItems.map(item => item.getLatLng()));
      this._map.fitBounds(bounds.pad(0.5));
    }
  }

  _drawEntities(hass) {
    /* eslint-disable vars-on-top */
    var map = this._map;
    if (!map) return;

    if (this._mapItems) {
      this._mapItems.forEach(function (marker) { marker.remove(); });
    }
    var mapItems = this._mapItems = [];

    // for (let entity of this._configEntities) {
    this._configEntities.forEach((entity) => {
      const entityId = entity.entity;
      if (!(entityId in hass.states)) {
        return;
      }
      const stateObj = hass.states[entityId];
      const title = entity.name || computeStateName(stateObj);
      const attr = stateObj.attributes;

      if (!(attr.latitude && attr.longitude)) {
        return;
      }

      let icon;
      let iconHTML;
      let el;

      if (computeStateDomain(stateObj) === 'zone') {
        // DRAW ZONE
        if (attr.passive) return;

        // create icon
        if (attr.icon) {
          el = document.createElement('ha-icon');
          el.setAttribute('icon', attr.icon);
          iconHTML = el.outerHTML;
        } else {
          iconHTML = title;
        }

        icon = Leaflet.divIcon({
          html: iconHTML,
          iconSize: [24, 24],
          className: '',
        });

        // create market with the icon
        mapItems.push(Leaflet.marker([attr.latitude, attr.longitude], {
          icon: icon,
          interactive: false,
          title: title,
        }).addTo(map));

        // create circle around it
        mapItems.push(Leaflet.circle([attr.latitude, attr.longitude], {
          interactive: false,
          color: '#FF9800',
          radius: attr.radius,
        }).addTo(map));

        return;
      }

      // DRAW ENTITY
      // create icon
      if (stateObj.state === 'home' && this._config.show_home === false) {
        return;
      }
      const entityIcon = entity.icon || '';
      const entityPicture = entityIcon ? '' : attr.entity_picture;
      const entityName = (entityPicture || entityIcon) ?
        '' : title.split(' ').map(part => part[0]).join('').substr(0, 3);

      el = document.createElement('ha-entity-marker');
      el.setAttribute('entity-id', entityId);
      el.setAttribute('entity-name', entityName);
      el.setAttribute('entity-picture', entityPicture);
      el.setAttribute('entity-icon', entityIcon);

      /* Leaflet clones this element before adding it to the map. This messes up
         our Polymer object and we can't pass data through. Thus we hack like this. */
      icon = Leaflet.divIcon({
        html: el.outerHTML,
        iconSize: [45, 45],
        className: '',
      });

      // create market with the icon
      mapItems.push(Leaflet.marker([attr.latitude, attr.longitude], {
        icon: icon,
        title: computeStateName(stateObj),
      }).addTo(map));

      // create circle around if entity has accuracy
      if (attr.gps_accuracy) {
        mapItems.push(Leaflet.circle([attr.latitude, attr.longitude], {
          interactive: false,
          color: '#0288D1',
          radius: attr.gps_accuracy,
        }).addTo(map));
      }
    });
  }
}

customElements.define('hui-map-card', HuiMapCard);
