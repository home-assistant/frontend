import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/entity/state-badge.js';

import computeStateName from '../../../common/entity/compute_state_name.js';

import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HuiGenericEntityRow extends EventsMixin(PolymerElement) {
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
            [[_computeName(config.name, _stateObj)]]
            <template is="dom-if" if="[[config.secondary_info]]">
              <div class="secondary">
                [[_computeSecondaryInfo(config.secondary_info, _stateObj)]]
              </div>
            </template>
          </div>
          <slot></slot>
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, config.entity)'
      }
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', () =>
      this.fire('hass-more-info', { entityId: this.config.entity }));
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
      default:
        return '';
    }
  }
}
customElements.define('hui-generic-entity-row', HuiGenericEntityRow);
