import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-button/paper-button";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";

import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HuiScriptEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        ${this.scriptControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin-right: -.57em;
        }
      </style>
    `;
  }

  static get scriptControlTemplate() {
    return html`
      <template is="dom-if" if="[[_stateObj.attributes.can_cancel]]">
        <ha-entity-toggle state-obj="[[_stateObj]]" hass="[[hass]]"></ha-entity-toggle>
      </template>
      <template is="dom-if" if="[[!_stateObj.attributes.can_cancel]]">
        <paper-button on-click="_callService">[[localize('ui.card.script.execute')]]</paper-button>
      </template>
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

  _callService(ev) {
    ev.stopPropagation();
    this.hass.callService("script", "turn_on", {
      entity_id: this._config.entity,
    });
  }
}
customElements.define("hui-script-entity-row", HuiScriptEntityRow);
