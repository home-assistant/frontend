import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-camera-preview-card.js';
import './hui-entities-card.js';
import './hui-entity-filter-card.js';
import './hui-glance-card';
import './hui-history-graph-card.js';
import './hui-media-control-card.js';
import './hui-picture-glance-card';
import './hui-plant-status-card.js';
import './hui-weather-forecast-card';

import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import computeCardElement from '../common/compute-card-element.js';

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

  constructor() {
    super();
    this._whenDefined = {};
  }

  getCardSize() {
    return this.lastChild ? this.lastChild.getCardSize() : 1;
  }

  // Return a list of entities based on filters.
  _getEntities(hass, filterList) {
    const entities = new Set();
    filterList.forEach((filter) => {
      const filters = [];
      if (filter.domain) {
        filters.push(stateObj => computeStateDomain(stateObj) === filter.domain);
      }
      if (filter.entity_id) {
        filters.push(stateObj => this._filterEntityId(stateObj, filter.entity_id));
      }
      if (filter.state) {
        filters.push(stateObj => stateObj.state === filter.state);
      }

      Object.values(hass.states).forEach((stateObj) => {
        if (filters.every(filterFunc => filterFunc(stateObj))) {
          entities.add(stateObj.entity_id);
        }
      });
    });
    return Array.from(entities);
  }

  _filterEntityId(stateObj, pattern) {
    if (pattern.indexOf('*') === -1) {
      return stateObj.entity_id === pattern;
    }
    const regEx = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return stateObj.entity_id.search(regEx) === 0;
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
      if (!(tag in this._whenDefined)) {
        this._whenDefined[tag] = customElements.whenDefined(tag)
          .then(() => this._configChanged(this.config));
      }
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
    return Object.assign(
      {},
      config.card_config,
      { entities: this._getEntities(this.hass, config.filter) }
    );
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
