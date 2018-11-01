import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/entity/state-info";

import timerTimeRemaining from "../common/entity/timer_time_remaining";
import secondsToDuration from "../common/datetime/seconds_to_duration";

class StateCardTimer extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
    <style>
      .state {
        @apply --paper-font-body1;
        color: var(--primary-text-color);

        margin-left: 16px;
        text-align: right;
        line-height: 40px;
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <div class="state">[[_secondsToDuration(timeRemaining)]]</div>
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
        observer: "stateObjChanged",
      },
      timeRemaining: Number,
      inDialog: {
        type: Boolean,
        value: false,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.startInterval(this.stateObj);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearInterval();
  }

  stateObjChanged(stateObj) {
    this.startInterval(stateObj);
  }

  clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = null;
    }
  }

  startInterval(stateObj) {
    this.clearInterval();
    this.calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      this._updateRemaining = setInterval(
        () => this.calculateRemaining(this.stateObj),
        1000
      );
    }
  }

  calculateRemaining(stateObj) {
    this.timeRemaining = timerTimeRemaining(stateObj);
  }

  _secondsToDuration(time) {
    return secondsToDuration(time);
  }
}
customElements.define("state-card-timer", StateCardTimer);
