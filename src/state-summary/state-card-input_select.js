import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/entity/state-badge";

import computeStateName from "../common/entity/compute_state_name";

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

    ${this.stateBadgeTemplate}
    <paper-dropdown-menu on-click="stopPropagation" selected-item-label="{{selectedOption}}" label="[[_computeStateName(stateObj)]]">
      <paper-listbox slot="dropdown-content" selected="[[computeSelected(stateObj)]]">
        <template is="dom-repeat" items="[[stateObj.attributes.options]]">
          <paper-item>[[item]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
`;
  }

  static get stateBadgeTemplate() {
    return html`
    <state-badge state-obj="[[stateObj]]"></state-badge>
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
        observer: "selectedOptionChanged",
      },
    };
  }

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }

  computeSelected(stateObj) {
    return stateObj.attributes.options.indexOf(stateObj.state);
  }

  selectedOptionChanged(option) {
    // Selected Option will transition to '' before transitioning to new value
    if (option === "" || option === this.stateObj.state) {
      return;
    }
    this.hass.callService("input_select", "select_option", {
      option: option,
      entity_id: this.stateObj.entity_id,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }
}
customElements.define("state-card-input_select", StateCardInputSelect);
