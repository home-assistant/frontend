import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../cards/ha-weather-card.js';

import createCardElement from '../common/create-card-element.js';
import createErrorCardConfig from '../common/create-error-card-config.js';
import validateEntityConfig from '../common/validate-entity-config.js';

class HuiWeatherForecastCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      config: {
        type: Object,
        observer: '_configChanged'
      }
    };
  }

  getCardSize() {
    return 3;
  }

  _configChanged(config) {
    this._entityId = null;

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    if (!validateEntityConfig(config, 'weather')) {
      const error = 'Error in card configuration.';
      const element = createCardElement(createErrorCardConfig(error, config));
      this.appendChild(element);
      return;
    }

    const entityId = config.entity;
    if (!(entityId in this.hass.states)) {
      return;
    }

    const element = document.createElement('ha-weather-card');
    element.stateObj = this.hass.states[entityId];
    element.hass = this.hass;
    this.appendChild(element);
    this._entityId = entityId;
  }

  _hassChanged(hass) {
    const entityId = this._entityId;
    if (entityId && entityId in hass.states) {
      const element = this.lastChild;
      element.stateObj = hass.states[entityId];
      element.hass = hass;
    } else {
      this._configChanged(this.config);
    }
  }
}

customElements.define('hui-weather-forecast-card', HuiWeatherForecastCard);
