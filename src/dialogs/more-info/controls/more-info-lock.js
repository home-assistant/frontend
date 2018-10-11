import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-input/paper-input.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-attributes.js";

import LocalizeMixin from "../../../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class MoreInfoLock extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-input {
          display: inline-block;
        }
      </style>

      <template is="dom-if" if="[[stateObj.attributes.code_format]]">
        <paper-input label="[[localize('ui.card.lock.code')]]" value="{{enteredCode}}" pattern="[[stateObj.attributes.code_format]]" type="password"></paper-input>
        <paper-button on-click="callService" data-service="unlock" hidden$="[[!isLocked]]">[[localize('ui.card.lock.unlock')]]</paper-button>
        <paper-button on-click="callService" data-service="lock" hidden$="[[isLocked]]">[[localize('ui.card.lock.lock')]]</paper-button>
      </template>
      <ha-attributes state-obj="[[stateObj]]" extra-filters="code_format"></ha-attributes>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: "stateObjChanged",
      },
      enteredCode: {
        type: String,
        value: "",
      },
      isLocked: Boolean,
    };
  }

  stateObjChanged(newVal) {
    if (newVal) {
      this.isLocked = newVal.state === "locked";
    }
  }

  callService(ev) {
    const service = ev.target.getAttribute("data-service");
    const data = {
      entity_id: this.stateObj.entity_id,
      code: this.enteredCode,
    };
    this.hass.callService("lock", service, data);
  }
}

customElements.define("more-info-lock", MoreInfoLock);
