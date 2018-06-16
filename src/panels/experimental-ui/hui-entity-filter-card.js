import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-entities-card.js';

import computeStateDomain from '../../common/entity/compute_state_domain.js';

class HuiEntitiesCard extends PolymerElement {
  static get template() {
    return html`
    <hui-entities-card
      hass='[[hass]]'
      config='[[_computeCardConfig(hass, config)]]'
    ></hui-entities-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
      config: Object,
    };
  }

  getCardSize() {
    // +1 for the header
    return 1 + this._getEntities(this.hass, this.config.filter).length;
  }

  // Return a list of entities based on a filter.
  _getEntities(hass, filter) {
    const filters = [];

    if (filter.domain) {
      const domain = filter.domain;
      filters.push(stateObj => computeStateDomain(stateObj) === domain);
    }

    if (filter.state) {
      const state = filter.state;
      filters.push(stateObj => stateObj.state === state);
    }

    return Object.values(hass.states)
      .filter(stateObj => filters.every(filterFunc => filterFunc(stateObj)))
      .map(stateObj => stateObj.entity_id);
  }

  _computeCardConfig(hass, config) {
    return Object.assign({}, config.card_config || {}, {
      entities: this._getEntities(hass, config.filter),
    });
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
