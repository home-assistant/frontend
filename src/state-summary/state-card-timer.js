import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import '../util/hass-mixins.js';
import '../util/hass-util.js';

import timerTimeRemaining from '../../js/common/entity/timer_time_remaining.js';
import secondsToDuration from '../../js/common/datetime/seconds_to_duration.js';

class StateCardTimer extends window.hassMixins.LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
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
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <div class="state">[[_secondsToDuration(timeRemaining)]]</div>
    </div>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: 'stateObjChanged',
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

    if (stateObj.state === 'active') {
      this._updateRemaining = setInterval(() => this.calculateRemaining(this.stateObj), 1000);
    }
  }

  calculateRemaining(stateObj) {
    this.timeRemaining = timerTimeRemaining(stateObj);
  }

  _secondsToDuration(time) {
    return secondsToDuration(time);
  }
}
customElements.define('state-card-timer', StateCardTimer);
