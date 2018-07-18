import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';

import '../components/hui-generic-entity-row.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiLockEntityRow extends LocalizeMixin(PolymerElement) {
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
          <paper-button on-click="_callService">
            [[_computeButtonTitle(_stateObj.state)]]
          </paper-button>
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

  _computeButtonTitle(state) {
    return state === 'locked' ?
      this.localize('ui.card.lock.unlock') : this.localize('ui.card.lock.lock');
  }

  _callService(ev) {
    ev.stopPropagation();
    const stateObj = this._stateObj;
    this.hass.callService('lock', stateObj.state === 'locked' ?
      'unlock' : 'lock', { entity_id: stateObj.entity_id });
  }
}
customElements.define('hui-lock-entity-row', HuiLockEntityRow);
