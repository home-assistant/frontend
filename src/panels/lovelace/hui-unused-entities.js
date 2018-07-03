import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeUnusedEntities from './common/compute-unused-entities.js';

import './cards/hui-entities-card.js';

class HuiUnusedEntities extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      config: Object
    };
  }

  static get template() {
    return html`
      <style>
        hui-entities-card {
          max-width: 600px;
        }
      </style>
      <hui-entities-card
        hass="[[hass]]"
        config="[[_computeCardConfig(hass.states, config)]]"
      ></hui-entities-card>
    `;
  }

  _computeCardConfig(states, config) {
    const entities = computeUnusedEntities(states, config);
    return {
      title: 'Unused entities',
      entities
    };
  }
}
customElements.define('hui-unused-entities', HuiUnusedEntities);


computeUnusedEntities(this.hass, this.config);