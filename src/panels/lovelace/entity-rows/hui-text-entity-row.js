import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/hui-generic-entity-row";

import computeStateDisplay from "../../../common/entity/compute_state_display";

import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HuiTextEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        ${this.textControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        div {
          text-align: right;
        }
      </style>
    `;
  }

  static get textControlTemplate() {
    return html`
      <div>
        [[_computeState(_stateObj)]]
      </div>
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

  _computeState(stateObj) {
    return stateObj && computeStateDisplay(this.localize, stateObj);
  }
}
customElements.define("hui-text-entity-row", HuiTextEntityRow);
