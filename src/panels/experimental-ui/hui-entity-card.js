import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeDomain from '../../common/entity/compute_domain.js';
import { DOMAINS_WITH_CARD } from '../../common/const.js';

import '../../cards/ha-camera-card.js';
import '../../cards/ha-history_graph-card.js';
import '../../cards/ha-media_player-card.js';
import '../../cards/ha-persistent_notification-card.js';
import '../../cards/ha-plant-card.js';
import '../../cards/ha-weather-card.js';

class HuiEntityCard extends PolymerElement {
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
    return this._entityId ? DOMAINS_WITH_CARD[domain] : 3;
  }

  _configChanged(config) {
    this._entityId = null;
    if (this.childNodes.length) {
      this.removeChild(this.childNodes[0]);
    }

    const entityId = config && config.entity;
    if (entityId) {
      const domain = computeDomain(entityId);
      if (Object.keys(DOMAINS_WITH_CARD).includes(domain)) {
        this._entityId = entityId;
        const element = document.createElement(`ha-${domain}-card`);
        element.stateObj = this.hass.states[entityId];
        element.hass = this.hass;
        this.appendChild(element);
      } else {
        // eslint-disable-next-line
        console.error('No card available for this domain:', domain);
      }
    } else {
      // eslint-disable-next-line
      console.error('Entity not defined in card config');
    }
  }

  _hassChanged(hass) {
    if (this.childNodes.length) {
      const element = this.childNodes[0];
      const stateObj = hass.states[this._entityId];
      element.stateObj = stateObj;
      element.hass = hass;
    }
  }
}

customElements.define('hui-entity-card', HuiEntityCard);
