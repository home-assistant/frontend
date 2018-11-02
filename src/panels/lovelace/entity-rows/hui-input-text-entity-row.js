import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-input/paper-input";

import "../components/hui-generic-entity-row";

class HuiInputTextEntityRow extends PolymerElement {
  static get template() {
    return html`
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        ${this.inputTextControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get inputTextControlTemplate() {
    return html`
      <paper-input
        no-label-float
        minlength="[[_stateObj.attributes.min]]"
        maxlength="[[_stateObj.attributes.max]]"
        value="{{_value}}"
        auto-validate="[[_stateObj.attributes.pattern]]"
        pattern="[[_stateObj.attributes.pattern]]"
        type="[[_stateObj.attributes.mode]]"
        on-change="_selectedValueChanged"
        placeholder="(empty value)"
      ></paper-input>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
        observer: "_stateObjChanged",
      },
      _value: String,
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Entity not configured.");
    }
    this._config = config;
  }

  _stateObjChanged(stateObj) {
    this._value = stateObj && stateObj.state;
  }

  _selectedValueChanged() {
    if (this._value === this._stateObj.state) {
      return;
    }
    this.hass.callService("input_text", "set_value", {
      value: this._value,
      entity_id: this._stateObj.entity_id,
    });
  }
}
customElements.define("hui-input-text-entity-row", HuiInputTextEntityRow);
