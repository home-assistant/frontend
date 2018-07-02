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
    if (!config.filter.include || !Array.isArray(config.filter.include)) {
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
    let entitiesList = this._getEntities(this.hass, this._config.filter.include);
    if (this._config.filter.exclude) {
      const excludeEntities = this._getEntities(this.hass, this._config.filter.exclude);
      entitiesList = entitiesList.filter(el => !excludeEntities.includes(el));
    }
    if (entitiesList.length === 0) {
      this.style.display = (this._config.show_empty === false) ? 'none' : 'block';
    } else {
      this.style.display = 'block';
    }
    element.setConfig(Object.assign(
      {},
      element._filterRawConfig,
      { entities: entitiesList }
    ));
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
