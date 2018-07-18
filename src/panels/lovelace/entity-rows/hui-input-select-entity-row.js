import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';

import '../../../components/entity/state-badge.js';

import computeStateName from '../../../common/entity/compute_state_name.js';

import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HuiInputSelectEntityRow extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          display: flex;
          align-items: center;
        }
        paper-dropdown-menu {
          margin-left: 16px;
          flex: 1;
        }

      </style>
      <template is="dom-if" if="[[_stateObj]]">
        <state-badge state-obj="[[_stateObj]]"></state-badge>
        <paper-dropdown-menu on-click="_stopPropagation" selected-item-label="{{_selected}}" label="[[_computeName(_config.name, _stateObj)]]">
          <paper-listbox slot="dropdown-content" selected="[[_computeSelected(_stateObj)]]">
            <template is="dom-repeat" items="[[_stateObj.attributes.options]]">
              <paper-item>[[item]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
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
      _selected: {
        type: String,
        observer: '_selectedChanged',
      },
    };
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

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
  }

  _computeName(name, stateObj) {
    return name || computeStateName(stateObj);
  }

  _computeSelected(stateObj) {
    return stateObj.attributes.options.indexOf(stateObj.state);
  }

  _selectedChanged(option) {
    // Selected Option will transition to '' before transitioning to new value
    if (option === '' || option === this._stateObj.state) {
      return;
    }
    this.hass.callService('input_select', 'select_option', {
      option: option,
      entity_id: this._stateObj.entity_id,
    });
  }

  _stopPropagation(ev) {
    ev.stopPropagation();
  }
}
customElements.define('hui-input-select-entity-row', HuiInputSelectEntityRow);
