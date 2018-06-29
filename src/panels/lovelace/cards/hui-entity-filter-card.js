import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import createCardElement from '../common/create-card-element.js';

class HuiEntitiesCard extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
    };
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

  setConfig(config) {
    if (!config.filter || !Array.isArray(config.filter)) {
      throw new Error('Incorrect filter config.');
    }

    this._config = config;

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const card = 'card' in config ? Object.assign({}, config.card) : {};
    if (!card.type) card.type = 'entities';
    card.entities = [];

    const element = createCardElement(card);
    element._filterRawConfig = card;
    this._updateCardConfig(element);
    element.hass = this.hass;
    this.appendChild(element);
  }

  _hassChanged(hass) {
    const element = this.lastChild;
    this._updateCardConfig(element);
    element.hass = hass;
  }

  _updateCardConfig(element) {
    if (!element || element.tagName === 'HUI-ERROR-CARD' || !this.hass) return;
    element.setConfig(Object.assign(
      {},
      element._filterRawConfig,
      { entities: this._getEntities(this.hass, this._config.filter) }
    ));
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
