import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/entity/state-badge.js';

import computeStateName from '../../../common/entity/compute_state_name.js';

import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HuiGenericEntityRowElement extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
          display: flex;
        }
        .flex {
          margin-left: 16px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
      </style>
      <template is="dom-if" if="[[_stateObj]]">
        <state-badge state-obj="[[_stateObj]]"></state-badge>
        <div class="flex">
          <div class="info">
            [[_computeName(_config.name, _stateObj)]]
            <template is="dom-if" if="[[_config.secondary_info]]">
              <div class="secondary">
                [[_computeSecondaryInfo(_config.secondary_info, _stateObj)]]
              </div>
            </template>
          </div>
          <div>
            controls
          </div>
        </div>
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

  ready() {
    super.ready();
    this.addEventListener('click', () => this._handleClick());
  }

  getCardSize() {
    return 1;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Card config incorrect');
    }
    this._config = config;
  }

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
  }

  _computeName(name, stateObj) {
    return name || computeStateName(stateObj);
  }

  _computeSecondaryInfo(info, stateObj) {
    switch (info) {
      case 'entity-id':
        return stateObj.entity_id;
      case 'entity-id':
        return stateObj.entity_id;
      default:
        return '';
    }
  }

  _handleClick() {
    this.fire('hass-more-info', { entityId: this._config.entity });
  }
}
customElements.define('hui-generic-entity-row-element', HuiGenericEntityRowElement);
