import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/entity/state-badge.js';
import '../../../components/ha-relative-time.js';

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
          display: flex;
        }
        .flex {
          margin-left: 16px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .secondary,
        ha-relative-time {
          display: block;
          color: var(--secondary-text-color);
        }
        .not-found {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
      </style>
      <template is="dom-if" if="[[_stateObj]]">
        <state-badge state-obj="[[_stateObj]]"></state-badge>
        <div class="flex">
          <div class="info">
            [[_computeName(config.name, _stateObj)]]
            <template is="dom-if" if="[[config.secondary_info]]">
              <template is="dom-if" if="[[_equals(config.secondary_info, 'entity-id')]]">
                <div class="secondary">
                  [[_stateObj.entity_id]]
                </div>
              </template>
              <template is="dom-if" if="[[_equals(config.secondary_info, 'last-changed')]]">
                <ha-relative-time
                  hass="[[hass]]"
                  datetime="[[_stateObj.last_changed]]"
                ></ha-relative-time>
              </template>
            </template>
          </div>
          <slot></slot>
        </div>
      </template>
      <template is="dom-if" if="[[!_stateObj]]">
        <div class="not-found">
          Entity not available: [[config.entity]]
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

  _equals(a, b) {
    return a === b;
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  _computeName(name, stateObj) {
    return name || computeStateName(stateObj);
  }
}
customElements.define('hui-generic-entity-row', HuiGenericEntityRow);
