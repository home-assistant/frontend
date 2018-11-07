import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/hui-generic-entity-row";

import timerTimeRemaining from "../../../common/entity/timer_time_remaining";
import secondsToDuration from "../../../common/datetime/seconds_to_duration";

class HuiTimerEntityRow extends PolymerElement {
  static get template() {
    return html`
      <hui-generic-entity-row hass="[[hass]]" config="[[_config]]">
        ${this.timerControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get timerControlTemplate() {
    return html`
      <div>[[_computeDisplay(_stateObj, _timeRemaining)]]</div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
        observer: "_stateObjChanged",
      },
      _timeRemaining: Number,
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearInterval();
  }

  _stateObjChanged(stateObj) {
    if (stateObj) {
      this._startInterval(stateObj);
    } else {
      this._clearInterval();
    }
  }

  _clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = null;
    }
  }

  _startInterval(stateObj) {
    this._clearInterval();
    this._calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      this._updateRemaining = setInterval(
        () => this._calculateRemaining(this._stateObj),
        1000
      );
    }
  }

  _calculateRemaining(stateObj) {
    this._timeRemaining = timerTimeRemaining(stateObj);
  }

  _computeDisplay(stateObj, time) {
    if (!stateObj) return null;

    if (stateObj.state === "idle" || time === 0) return stateObj.state;

    let display = secondsToDuration(time);

    if (stateObj.state === "paused") {
      display += " (paused)";
    }

    return display;
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
customElements.define("hui-timer-entity-row", HuiTimerEntityRow);
