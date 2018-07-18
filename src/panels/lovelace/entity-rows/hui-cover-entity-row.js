import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';
import '../../../components/ha-cover-controls.js';
import '../../../components/ha-cover-tilt-controls.js';
import CoverEntity from '../../../util/cover-model.js';

class HuiCoverEntityRow extends PolymerElement {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin: 0;
        }
      </style>
      <template is="dom-if" if="[[_stateObj]]">
        <hui-generic-entity-row
          hass="[[hass]]"
          config="[[_config]]"
        >
          <template is="dom-if" if="[[!_entityObj.isTiltOnly]]">
            <ha-cover-controls hass="[[hass]]" state-obj="[[_stateObj]]"></ha-cover-controls>
          </template>
          <template is="dom-if" if="[[_entityObj.isTiltOnly]]">
            <ha-cover-tilt-controls hass="[[hass]]" state-obj="[[_stateObj]]"></ha-cover-tilt-controls>
          </template>
        </hui-generic-entity-row>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)'
      },
      _entityObj: {
        type: Object,
        computed: '_computeEntityObj(hass, _stateObj)'
      },
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
  }

  _computeEntityObj(hass, stateObj) {
    return new CoverEntity(hass, stateObj);
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  getCardSize() {
    return 1;
  }
}
customElements.define('hui-cover-entity-row', HuiCoverEntityRow);
