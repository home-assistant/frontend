import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiClimateEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        .state-label {
          font-weight: bold;
          text-transform: capitalize;
        }
      </style>
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        <div>
          <span class="state-label">
            [[_computeState(_stateObj)]]
          </span>
          [[_computeTarget(_stateObj)]]
        </div>
        
        <div slot="secondary">
          [[localize('ui.card.climate.currently')]]: [[_computeCurrentStatus(_stateObj)]]
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
        computed: '_computeStateObj(hass.states, _config.entity)'
      }
    };
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

  _computeState(stateObj) {
    if (!stateObj) {
      return this.localize('state.default.unavailable');
    }
    return this.localize(`state.climate.${stateObj.state}`) || stateObj.state;
  }

  _computeCurrentStatus(stateObj) {
    if (!stateObj) return null;

    if (stateObj.attributes.current_temperature != null) {
      return `${stateObj.attributes.current_temperature} ${stateObj.attributes.unit_of_measurement}`;
    }
    if (stateObj.attributes.current_humidity != null) {
      return `${stateObj.attributes.current_humidity} ${stateObj.attributes.unit_of_measurement}`;
    }

    return null;
  }

  _computeTarget(stateObj) {
    if (!stateObj) return null;

    const {
      temperature,
      humidity,
      target_temp_high: tempHigh,
      target_temp_low: tempLow,
      target_humidity_high: humHigh,
      target_humidity_low: humLow,
      unit_of_measurement: units
    } = stateObj.attributes;

    // We're using "!= null" on purpose so that we match both null and undefined.
    if (tempHigh != null && tempLow != null) {
      return `${tempLow} - ${tempHigh} ${units}`;
    } else if (temperature != null) {
      return `${temperature} ${units}`;
    } else if (humLow != null && humHigh != null) {
      return `${humLow} - ${humHigh} ${units}`;
    } else if (humidity != null) {
      return `${humidity} ${units}`;
    }

    return null;
  }
}
customElements.define('hui-climate-entity-row', HuiClimateEntityRow);
