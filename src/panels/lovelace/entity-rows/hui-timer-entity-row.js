import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';

import timerTimeRemaining from '../../../common/entity/timer_time_remaining.js';
import secondsToDuration from '../../../common/datetime/seconds_to_duration.js';

class HuiTextEntityRow extends PolymerElement {
  static get template() {
    return html`
      <template is="dom-if" if="[[_stateObj]]">
        <hui-generic-entity-row
          hass="[[hass]]"
          config="[[_config]]"
        >
          <div>
            [[_secondsToDuration(_timeRemaining)]]
          </div>
        </hui-generic-entity-row>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)'
      },
      _timeRemaining: Number
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._startInterval(this.stateObj);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearInterval();
  }

  stateObjChanged(stateObj) {
    this._startInterval(stateObj);
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

    if (stateObj.state === 'active') {
      this._updateRemaining = setInterval(() => this._calculateRemaining(this.stateObj), 1000);
    }
  }

  _calculateRemaining(stateObj) {
    this._timeRemaining = timerTimeRemaining(stateObj);
  }

  _secondsToDuration(time) {
    return secondsToDuration(time);
  }

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  getCardSize() {
    return 1;
  }
}
customElements.define('hui-text-entity-row', HuiTextEntityRow);
