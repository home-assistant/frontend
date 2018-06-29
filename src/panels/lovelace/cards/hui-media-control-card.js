import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../cards/ha-media_player-card.js';

import createCardElement from '../common/create-card-element.js';
import validateEntityConfig from '../common/validate-entity-config.js';

class HuiMediaControlCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
    };
  }

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!validateEntityConfig(config, 'media_player')) {
      throw new Error('Error in card configuration.');
    }

    this._entityId = null;

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const entityId = config.entity;
    if (!(entityId in this.hass.states)) {
      return;
    }

    const element = document.createElement('ha-media_player-card');
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

customElements.define('hui-media-control-card', HuiMediaControlCard);
