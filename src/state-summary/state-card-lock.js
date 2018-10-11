import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import "@polymer/paper-button/paper-button.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../components/entity/state-info.js";

import LocalizeMixin from "../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class StateCardLock extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
    <style>
      paper-button {
        color: var(--primary-color);
        font-weight: 500;
        top: 3px;
        height: 37px;
        margin-right: -.57em;
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <paper-button on-click="_callService" data-service="unlock" hidden$="[[!isLocked]]">[[localize('ui.card.lock.unlock')]]</paper-button>
      <paper-button on-click="_callService" data-service="lock" hidden$="[[isLocked]]">[[localize('ui.card.lock.lock')]]</paper-button>
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
      stateObj: {
        type: Object,
        observer: "_stateObjChanged",
      },
      inDialog: {
        type: Boolean,
        value: false,
      },
      isLocked: Boolean,
    };
  }

  _stateObjChanged(newVal) {
    if (newVal) {
      this.isLocked = newVal.state === "locked";
    }
  }

  _callService(ev) {
    ev.stopPropagation();
    const service = ev.target.dataset.service;
    const data = {
      entity_id: this.stateObj.entity_id,
    };
    this.hass.callService("lock", service, data);
  }
}
customElements.define("state-card-lock", StateCardLock);
