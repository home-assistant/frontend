import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-error-card';

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
      error = 'Missing config for child card.';
    } else if (!config.card.type) {
      config.card.type = 'entities';
    }


    if (error) {
      element = document.createElement('hui-error-card');
      element.error = error;
      element.config = config;
    } else {
      element = createCardElement(config.card);
      element.config = this._computeCardConfig(config);
      element.hass = this.hass;
      this._cardReady = true;
    }
    this.appendChild(element);
  }

  _hassChanged(hass) {
    if (!this._cardReady) return;
    const element = this.lastChild;
    if (element) {
      element.hass = hass;
      element.config = this._computeCardConfig(this.config);
    }
  }

  _computeCardConfig(config) {
    return Object.assign(
      {},
      config.card,
      { entities: this._getEntities(this.hass, config.filter) }
    );
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
