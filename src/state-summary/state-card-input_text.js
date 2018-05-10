import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-input/paper-input.js';
import '../components/entity/state-info.js';
import '../util/hass-util.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class StateCardInputText extends PolymerElement {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
    <style>
      paper-input {
        margin-left: 16px;
      }
    </style>

    <div class="horizontal justified layout">
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <paper-input no-label-float="" minlength="[[stateObj.attributes.min]]" maxlength="[[stateObj.attributes.max]]" value="{{value}}" auto-validate="[[stateObj.attributes.pattern]]" pattern="[[stateObj.attributes.pattern]]" type="[[stateObj.attributes.mode]]" on-change="selectedValueChanged" on-click="stopPropagation" placeholder="(empty value)">
      </paper-input>
    </div>
`;
  }

  static get is() { return 'state-card-input_text'; }

  static get properties() {
    return {
      hass: Object,

      inDialog: {
        type: Boolean,
        value: false,
      },

      stateObj: {
        type: Object,
        observer: 'stateObjectChanged',
      },

      pattern: {
        type: String,
      },

      value: {
        type: String,
      }

    };
  }

  stateObjectChanged(newVal) {
    this.value = newVal.state;
  }

  selectedValueChanged() {
    if (this.value === this.stateObj.state) {
      return;
    }
    this.hass.callService('input_text', 'set_value', {
      value: this.value,
      entity_id: this.stateObj.entity_id,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }
}

customElements.define(StateCardInputText.is, StateCardInputText);
