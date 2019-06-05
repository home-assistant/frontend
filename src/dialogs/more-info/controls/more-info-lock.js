import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-attributes";

import LocalizeMixin from "../../../mixins/localize-mixin";

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
        <paper-input
          label="[[localize('ui.card.lock.code')]]"
          value="{{enteredCode}}"
          pattern="[[stateObj.attributes.code_format]]"
          type="password"
        ></paper-input>
        <mwc-button
          on-click="callService"
          data-service="unlock"
          hidden$="[[!isLocked]]"
          >[[localize('ui.card.lock.unlock')]]</mwc-button
        >
        <mwc-button
          on-click="callService"
          data-service="lock"
          hidden$="[[isLocked]]"
          >[[localize('ui.card.lock.lock')]]</mwc-button
        >
      </template>
      <ha-attributes
        state-obj="[[stateObj]]"
        extra-filters="code_format"
      ></ha-attributes>
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
