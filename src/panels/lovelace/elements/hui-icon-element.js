import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-icon.js";

import ElementClickMixin from "../mixins/element-click-mixin.js";
import { longPressBind } from "../common/directives/long-press-directive";

/*
 * @appliesMixin ElementClickMixin
 */
class HuiIconElement extends ElementClickMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
        }
      </style>
      <ha-icon
        icon="[[_config.icon]]"
        title$="[[computeTooltip(hass, _config)]]"
      ></ha-icon>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
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
    if (!config || !config.icon) {
      throw Error("Error in element configuration");
    }

    this._config = config;
  }
}
customElements.define("hui-icon-element", HuiIconElement);
