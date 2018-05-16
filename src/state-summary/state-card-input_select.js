import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-badge.js';

class StateCardInputSelect extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
      }

      state-badge {
        float: left;
        margin-top: 10px;
      }

      paper-dropdown-menu {
        display: block;
        margin-left: 53px;
      }

      paper-item {
        cursor: pointer;
      }
    </style>

    <state-badge state-obj="[[stateObj]]"></state-badge>
    <paper-dropdown-menu on-click="stopPropagation" selected-item-label="{{selectedOption}}" label="[[computeStateName(stateObj)]]">
      <paper-listbox slot="dropdown-content" selected="[[computeSelected(stateObj)]]">
        <template is="dom-repeat" items="[[stateObj.attributes.options]]">
          <paper-item>[[item]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
      selectedOption: {
        type: String,
        observer: 'selectedOptionChanged',
      },
    };
  }

  computeStateName(stateObj) {
    return window.hassUtil.computeStateName(stateObj);
  }

  computeSelected(stateObj) {
    return stateObj.attributes.options.indexOf(stateObj.state);
  }

  selectedOptionChanged(option) {
    // Selected Option will transition to '' before transitioning to new value
    if (option === '' || option === this.stateObj.state) {
      return;
    }
    this.hass.callService('input_select', 'select_option', {
      option: option,
      entity_id: this.stateObj.entity_id,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }
}
customElements.define('state-card-input_select', StateCardInputSelect);
