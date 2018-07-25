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
        ha-cover-controls,
        ha-cover-tilt-controls {
          margin-right: -.57em;
        }
      </style>
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
    return states && entityId in states ? states[entityId] : null;
  }

  _computeEntityObj(hass, stateObj) {
    return stateObj ? new CoverEntity(hass, stateObj) : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }
}
customElements.define('hui-cover-entity-row', HuiCoverEntityRow);
