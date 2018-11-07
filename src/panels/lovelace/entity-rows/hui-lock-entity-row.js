import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-button/paper-button";

import "../components/hui-generic-entity-row";

import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HuiLockEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row hass="[[hass]]" config="[[_config]]">
        ${this.lockControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin-right: -0.57em;
        }
      </style>
    `;
  }

  static get lockControlTemplate() {
    return html`
      <paper-button on-click="_callService">
        [[_computeButtonTitle(_stateObj.state)]]
      </paper-button>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
      },
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

  _computeButtonTitle(state) {
    return state === "locked"
      ? this.localize("ui.card.lock.unlock")
      : this.localize("ui.card.lock.lock");
  }

  _callService(ev) {
    ev.stopPropagation();
    const stateObj = this._stateObj;
    this.hass.callService(
      "lock",
      stateObj.state === "locked" ? "unlock" : "lock",
      { entity_id: stateObj.entity_id }
    );
  }
}
customElements.define("hui-lock-entity-row", HuiLockEntityRow);
