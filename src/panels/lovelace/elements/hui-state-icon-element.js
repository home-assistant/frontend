import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/entity/state-badge.js";

import ElementClickMixin from "../mixins/element-click-mixin.js";
import { longPressBind } from "../common/directives/long-press-directive";

/*
 * @appliesMixin ElementClickMixin
 */
class HuiStateIconElement extends ElementClickMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
        }
      </style>
      <state-badge
        state-obj="[[_stateObj]]"
        title$="[[computeTooltip(hass, _config)]]"
      ></state-badge>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      _config: Object,
      _stateObj: Object,
    };
  }

  ready() {
    super.ready();
    longPressBind(this);
    this.addEventListener("ha-click", () =>
      this.handleClick(this.hass, this._config, false)
    );
    this.addEventListener("ha-hold", () =>
      this.handleClick(this.hass, this._config, true)
    );
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw Error("Error in element configuration");
    }

    this._config = config;
  }

  _hassChanged(hass) {
    this._stateObj = hass.states[this._config.entity];
  }
}
customElements.define("hui-state-icon-element", HuiStateIconElement);
