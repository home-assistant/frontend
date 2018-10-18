import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import "../../../components/entity/ha-state-label-badge.js";
import computeStateName from "../../../common/entity/compute_state_name";

class HuiStateBadgeElement extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      _config: Object,
    };
  }

  static get observers() {
    return ["_updateBadge(hass, _config)"];
  }

  _updateBadge(hass, config) {
    if (!hass || !config || !(config.entity in hass.states)) return;

    if (!this._badge) {
      this._badge = document.createElement("ha-state-label-badge");
    }

    const stateObj = hass.states[config.entity];
    this._badge.hass = hass;
    this._badge.state = stateObj;
    this._badge.setAttribute("title", computeStateName(stateObj));

    if (!this.lastChild) {
      this.appendChild(this._badge);
    }
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw Error("Error in element configuration");
    }

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    this._badge = null;
    this._config = config;
  }
}
customElements.define("hui-state-badge-element", HuiStateBadgeElement);
