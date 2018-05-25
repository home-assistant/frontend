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

  _computeCardConfig(hass, config) {
    const filters = [];

    if (config.filter.domain) {
      const domain = config.filter.domain;
      filters.push(stateObj => computeStateDomain(stateObj) === domain);
    }

    if (config.filter.state) {
      const state = config.filter.state;
      filters.push(stateObj => stateObj.state === state);
    }

    const entities = Object.values(hass.states)
      .filter(stateObj => filters.every(filter => filter(stateObj)))
      .map(stateObj => stateObj.entity_id);

    return Object.assign({}, config.card_config || {}, {
      entities
    });
  }
}
customElements.define('hui-entity-filter-card', HuiEntitiesCard);
