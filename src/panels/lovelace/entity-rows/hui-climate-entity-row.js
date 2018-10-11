import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-climate-state.js";
import "../components/hui-generic-entity-row.js";

class HuiClimateEntityRow extends PolymerElement {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        ${this.climateControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        ha-climate-state {
          text-align: right;
        }
      </style>
    `;
  }

  static get climateControlTemplate() {
    return html`
      <ha-climate-state
        hass="[[hass]]"
        state-obj="[[_stateObj]]"
      ></ha-climate-state>
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
}
customElements.define("hui-climate-entity-row", HuiClimateEntityRow);
