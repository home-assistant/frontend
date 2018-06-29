import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../cards/ha-weather-card.js';

import validateEntityConfig from '../common/validate-entity-config.js';

class HuiWeatherForecastCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
    };
  }

  getCardSize() {
    return 4;
  }

  setConfig(config) {
    if (!validateEntityConfig(config, 'weather')) {
      throw new Error('Error in card configuration.');
    }

    this._entityId = null;

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const element = document.createElement('ha-weather-card');
    this.appendChild(element);
    this._entityId = config.entity;
  }

  _hassChanged(hass) {
    const entityId = this._entityId;
    if (entityId in hass.states) {
      const element = this.lastChild;
      element.stateObj = hass.states[entityId];
      element.hass = hass;
    }
  }
}

customElements.define('hui-weather-forecast-card', HuiWeatherForecastCard);
