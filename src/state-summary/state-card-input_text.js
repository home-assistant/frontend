/* eslint-plugin-disable lit */
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../components/entity/state-info";
import "../components/ha-textfield";

class StateCardInputText extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        ha-textfield {
          margin-left: 16px;
        }
      </style>

      <div class="horizontal justified layout">
        ${this.stateInfoTemplate}
        <ha-textfield
          minlength="[[stateObj.attributes.min]]"
          maxlength="[[stateObj.attributes.max]]"
          value="[[value]]"
          auto-validate="[[stateObj.attributes.pattern]]"
          pattern="[[stateObj.attributes.pattern]]"
          type="[[stateObj.attributes.mode]]"
          on-input="onInput"
          on-change="selectedValueChanged"
          on-click="stopPropagation"
          placeholder="(empty value)"
        >
        </ha-textfield>
      </div>
    `;
  }

  static get stateInfoTemplate() {
    return html`
      <state-info
        hass="[[hass]]"
        state-obj="[[stateObj]]"
        in-dialog="[[inDialog]]"
      ></state-info>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      inDialog: {
        type: Boolean,
        value: false,
      },

      stateObj: {
        type: Object,
        observer: "stateObjectChanged",
      },

      pattern: String,
      value: String,
    };
  }

  stateObjectChanged(newVal) {
    this.value = newVal.state;
  }

  onInput(ev) {
    this.value = ev.target.value;
  }

  selectedValueChanged() {
    if (this.value === this.stateObj.state) {
      return;
    }
    this.hass.callService("input_text", "set_value", {
      value: this.value,
      entity_id: this.stateObj.entity_id,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }
}

customElements.define("state-card-input_text", StateCardInputText);
