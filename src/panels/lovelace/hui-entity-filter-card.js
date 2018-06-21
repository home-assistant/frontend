import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDomain from '../../common/entity/compute_state_domain.js';
import computeCardElement from './common/compute-card-element.js';

class HuiEntitiesCard extends PolymerElement {
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
    // +1 for the header
    return 5;
  }

  // Return a list of entities based on filters.
  _getEntities(hass, filters) {
    const entities = new Set;

    filters.forEach((filter) => {
      const _filters = [];
      if (filter.domain) {
        _filters.push(stateObj => computeStateDomain(stateObj) === filter.domain);
      }
      if (filter.state) {
        filters.push(stateObj => stateObj.state === filter.state);
      }

      Object.keys(hass.states).forEach((stateObj) => {
        if (_filters.every(filterFunc => filterFunc(stateObj))) {
          entities.add(stateObj.entity_id);
        }
      });
    });
  }

  _configChanged(config) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    let error = null;
    let cardConfig;
    let tag = config.card ? computeCardElement(config.card) : 'hui-entities-card';

    if (tag === null) {
      error = `Unknown card type encountered: "${config.card}".`;
    } else if (!customElements.get(tag)) {
      error = `Custom element doesn't exist: "${tag}".`;
    } else if (!config.filter || !Array.isArray(config.filter)) {
      error = 'No or incorrect filter.';
    }
    if (error) {
      tag = 'hui-error-card';
      cardConfig = { error };
    } else {
      cardConfig = this._computeCardConfig(config);
    }

    const element = document.createElement(tag);
    element.config = cardConfig;
    element.hass = this.hass;
    this.appendChild(element);
  }

  _hassChanged(hass) {
    const element = this.lastChild;
    if (element) {
      element.hass = hass;
      element.config = this._computeCardConfig(this.config);
    }
  }

  _computeCardConfig(config) {
    const cardConfig = { ...config, entities: this._getEntities(this.hass, config.filter) };
    delete cardConfig.card;
    delete cardConfig.filter;
    return cardConfig;
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
