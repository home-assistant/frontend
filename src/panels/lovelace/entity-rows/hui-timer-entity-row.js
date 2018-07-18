import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';

import timerTimeRemaining from '../../../common/entity/timer_time_remaining.js';
import secondsToDuration from '../../../common/datetime/seconds_to_duration.js';

class HuiTextEntityRow extends PolymerElement {
  static get template() {
    return html`
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        <div>
          [[_secondsToDuration(_timeRemaining)]]
        </div>
      </hui-generic-entity-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)',
        observer: '_stateObjChanged'
      },
      _timeRemaining: Number
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearInterval();
  }

  _stateObjChanged(stateObj) {
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
      this._updateRemaining = setInterval(() => this._calculateRemaining(this._stateObj), 1000);
    }
  }

  _calculateRemaining(stateObj) {
    this._timeRemaining = timerTimeRemaining(stateObj);
  }

  _secondsToDuration(time) {
    return secondsToDuration(time);
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }
}
customElements.define('hui-text-entity-row', HuiTextEntityRow);
