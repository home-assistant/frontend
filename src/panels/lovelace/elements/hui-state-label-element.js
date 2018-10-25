import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import computeStateDisplay from "../../../common/entity/compute_state_display.js";

import "../../../components/entity/ha-state-label-badge.js";

import LocalizeMixin from "../../../mixins/localize-mixin.js";
import ElementClickMixin from "../mixins/element-click-mixin.js";
import { longPressBind } from "../common/directives/long-press-directive";

/*
 * @appliesMixin ElementClickMixin
 * @appliesMixin LocalizeMixin
 */
class HuiStateLabelElement extends LocalizeMixin(
  ElementClickMixin(PolymerElement)
) {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
        }
        .state-label {
          padding: 8px;
          white-space: nowrap;
        }
      </style>
      <div class="state-label" title$="[[computeTooltip(hass, _config)]]">
        [[_config.prefix]][[_computeStateDisplay(_stateObj)]][[_config.suffix]]
      </div>
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

  _computeStateDisplay(stateObj) {
    return stateObj ? computeStateDisplay(this.localize, stateObj) : "-";
  }
}
customElements.define("hui-state-label-element", HuiStateLabelElement);
