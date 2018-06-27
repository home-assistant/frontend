import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import createCardElement from '../common/create-card-element.js';
import createErrorCardConfig from '../common/create-error-card-config.js';

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

    if (!config.filter || !Array.isArray(config.filter)) {
      error = 'Incorrect filter config.';
    } else if (!config.card) {
      config = Object.assign({}, config, {
        card: { type: 'entities' }
      });
    } else if (!config.card.type) {
      config = Object.assign({}, config, {
        card: Object.assign({}, config.card, { type: 'entities' })
      });
    }

    let element;

    if (error) {
      element = createCardElement(createErrorCardConfig(error, config.card));
    } else {
      element = createCardElement(config.card);
      element._filterRawConfig = config.card;
      this._updateCardConfig(element);
      element.hass = this.hass;
    }
    this.appendChild(element);
  }

  _hassChanged(hass) {
    const element = this.lastChild;
    this._updateCardConfig(element);
    element.hass = hass;
  }

  _updateCardConfig(element) {
    if (!element || element.tagName === 'HUI-ERROR-CARD') return;
    element.config = Object.assign(
      {},
      element._filterRawConfig,
      { entities: this._getEntities(this.hass, this.config.filter) }
    );
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
