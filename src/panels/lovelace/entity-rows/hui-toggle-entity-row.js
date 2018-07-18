import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';
import '../../../components/entity/ha-entity-toggle.js';

class HuiToggleEntityRow extends PolymerElement {
  static get template() {
    return html`
      <template is="dom-if" if="[[_stateObj]]">
        <hui-generic-entity-row
          hass="[[hass]]"
          config="[[_config]]"
        >
          <ha-entity-toggle hass="[[hass]]" state-obj="[[_stateObj]]"></ha-entity-toggle>
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
      }
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
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
customElements.define('hui-toggle-entity-row', HuiToggleEntityRow);
