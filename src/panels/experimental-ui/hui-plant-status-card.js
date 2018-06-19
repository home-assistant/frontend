import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeDomain from '../../common/entity/compute_domain.js';

import '../../cards/ha-plant-card.js';
import './hui-error-card.js';

class HuiPlantStatusCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged',
      },
      config: {
        type: Object,
        observer: '_configChanged',
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

    let error = null;
    let cardConfig;
    let tag;

    const entityId = config && config.entity;
    if (entityId) {
      if (computeDomain(entityId) === 'plant') {
        this._entityId = entityId;
        tag = 'ha-plant-card';
        cardConfig = config;
      } else {
        error = 'Entity domain must be "plant"';
      }
    } else {
      error = 'Entity not defined in card config';
    }

    if (error) {
      tag = 'hui-error-card';
      cardConfig = { error };
    }
    const element = document.createElement(tag);

    if (!error) {
      element.stateObj = this.hass.states[entityId];
      element.hass = this.hass;
    }

    element.config = cardConfig;
    this.appendChild(element);
  }

  _hassChanged(hass) {
    if (this.lastChild && this._entityId) {
      const element = this.childNodes[0];
      const stateObj = hass.states[this._entityId];
      element.stateObj = stateObj;
      element.hass = hass;
    }
  }
}

customElements.define('hui-plant-status-card', HuiPlantStatusCard);
