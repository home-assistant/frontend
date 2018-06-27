import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import createCardElement from '../common/create-card-element';

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
    this.elementNotDefinedCallback = this.elementNotDefinedCallback.bind(this);
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
    let error;
    let element;

    if (!config.filter || !Array.isArray(config.filter)) {
      error = 'Incorrect filter config.';
    } else if (!config.card) {
      config.card = { type: 'entities' };
    } else if (!config.card.type) {
      config.card.type = 'entities';
    }


    if (error) {
      element = createCardElement(config, this.elementNotDefinedCallback, error);
    } else {
      element = createCardElement(config.card, this.elementNotDefinedCallback, null);
      element.config = this._computeCardConfig(config);
      element.hass = this.hass;
    }
    this.appendChild(element);
  }

  _hassChanged(hass) {
    const element = this.lastChild;
    if (!element || element.tagName === 'HUI-ERROR-CARD') return;

    element.hass = hass;
    element.config = this._computeCardConfig(this.config);
  }

  _computeCardConfig(config) {
    return Object.assign(
      {},
      config.card,
      { entities: this._getEntities(this.hass, config.filter) }
    );
  }

  elementNotDefinedCallback(tag) {
    if (!(tag in this._whenDefined)) {
      this._whenDefined[tag] = customElements.whenDefined(tag)
        .then(() => this._configChanged(this.config));
    }
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
