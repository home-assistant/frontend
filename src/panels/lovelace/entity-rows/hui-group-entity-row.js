import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';
import '../../../components/entity/ha-entity-toggle.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import { DOMAINS_TOGGLE } from '../../../common/const.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiGroupEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        <template is="dom-if" if="[[_canToggle]]">
          <ha-entity-toggle
            hass="[[hass]]"
            state-obj="[[_stateObj]]"
          ></ha-entity-toggle>
        </template>
        <template is="dom-if" if="[[!_canToggle]]">
          <div>
            [[_computeState(_stateObj)]]
          </div>
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
      _canToggle: {
        type: Boolean,
        computed: '_computeCanToggle(_stateObj.attributes.entity_id)'
      }
    };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  _computeCanToggle(entityIds) {
    return entityIds.some(entityId => DOMAINS_TOGGLE.has(entityId.split('.', 1)[0]));
  }

  _computeState(stateObj) {
    return computeStateDisplay(this.localize, stateObj);
  }
}
customElements.define('hui-group-entity-row', HuiGroupEntityRow);
