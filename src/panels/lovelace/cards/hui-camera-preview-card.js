import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../cards/ha-camera-card.js';

import createCardElement from '../common/create-card-element.js';
import validateEntityConfig from '../common/validate-entity-config.js';

class HuiCameraPreviewCard extends PolymerElement {
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
    if (!validateEntityConfig(config, 'camera')) {
      throw new Error('Error in card configuration.');
    }

    this._config = config;
    this._entityId = null;

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const entityId = config.entity;
    if (!(entityId in this.hass.states)) {
      return;
    }

    const element = document.createElement('ha-camera-card');
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
    }
  }
}

customElements.define('hui-camera-preview-card', HuiCameraPreviewCard);
