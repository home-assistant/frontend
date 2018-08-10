import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-slider/paper-slider.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';

import '../components/hui-generic-entity-row.js';

class HuiInputNumberEntityRow extends mixinBehaviors([IronResizableBehavior], PolymerElement) {
  static get template() {
    return html`
      <style>
        .flex {
          display: flex;
          align-items: center;
        }
        .state {
          min-width: 45px;
          text-align: center;
        }
        paper-input {
          text-align: right;
        }
      </style>
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
        id="input_number_card"
      >
        <div>
          <template is="dom-if" if="[[_equals(_stateObj.attributes.mode, 'slider')]]">
            <div class="flex">
              <paper-slider
                min="[[_min]]"
                max="[[_max]]"
                value="{{_value}}"
                step="[[_step]]"
                pin
                on-change="_selectedValueChanged"
                ignore-bar-touch
              ></paper-slider>
              <span class="state">[[_value]] [[_stateObj.attributes.unit_of_measurement]]</span>
            </div>
          </template>
          <template is="dom-if" if="[[_equals(_stateObj.attributes.mode, 'box')]]">
            <paper-input
              no-label-float
              auto-validate
              pattern="[0-9]+([\\.][0-9]+)?"
              step="[[_step]]"
              min="[[_min]]"
              max="[[_max]]"
              value="{{_value}}"
              type="number"
              on-change="_selectedValueChanged"
            ></paper-input>
          </template>
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
      _min: {
        type: Number,
        value: 0
      },
      _max: {
        type: Number,
        value: 100
      },
      _step: Number,
      _value: Number
    };
  }

  _equals(a, b) {
    return a === b;
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

  _stateObjChanged(stateObj) {
    this.setProperties({
      _min: Number(stateObj.attributes.min),
      _max: Number(stateObj.attributes.max),
      _step: Number(stateObj.attributes.step),
      _value: Number(stateObj.state)
    });
  }

  _selectedValueChanged() {
    if (this._value === Number(this._stateObj.state)) return;

    this.hass.callService('input_number', 'set_value', {
      value: this._value,
      entity_id: this._stateObj.entity_id,
    });
  }
}
customElements.define('hui-input-number-entity-row', HuiInputNumberEntityRow);
