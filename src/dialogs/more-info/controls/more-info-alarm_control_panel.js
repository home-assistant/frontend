import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

class MoreInfoAlarmControlPanel extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        paper-input {
          margin: auto;
          max-width: 200px;
        }
        .pad {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .pad div {
          display: flex;
          flex-direction: column;
        }
        .pad paper-button {
          width: 80px;
        }
        .actions paper-button {
          min-width: 160px;
          margin-bottom: 16px;
          color: var(--primary-color);
        }
        paper-button.disarm {
          color: var(--google-red-500);
        }
      </style>

      <template is="dom-if" if="[[_codeFormat]]">
        <paper-input
          label="[[localize('ui.card.alarm_control_panel.code')]]"
          value="{{_enteredCode}}"
          type="password"
          disabled="[[!_inputEnabled]]"
        ></paper-input>

        <template is="dom-if" if="[[_isNumber(_codeFormat)]]">
          <div class="pad">
            <div>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="1" raised>1</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="4" raised>4</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="7" raised>7</paper-button>
            </div>
            <div>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="2" raised>2</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="5" raised>5</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="8" raised>8</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="0" raised>0</paper-button>
            </div>
            <div>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="3" raised>3</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="6" raised>6</paper-button>
              <paper-button on-click='_digitClicked' disabled='[[!_inputEnabled]]' data-digit="9" raised>9</paper-button>
              <paper-button on-click='_clearEnteredCode' disabled='[[!_inputEnabled]]' raised>
                [[localize('ui.card.alarm_control_panel.clear_code')]]
              </paper-button>
            </div>
          </div>
        </template>
      </template>

      <div class="layout horizontal center-justified actions">
        <template is="dom-if" if="[[_disarmVisible]]">
          <paper-button raised class="disarm" on-click="_callService" data-service="alarm_disarm" disabled="[[!_codeValid]]">
            [[localize('ui.card.alarm_control_panel.disarm')]]
          </paper-button>
        </template>
        <template is="dom-if" if="[[_armVisible]]">
          <paper-button raised on-click="_callService" data-service="alarm_arm_home" disabled="[[!_codeValid]]">
            [[localize('ui.card.alarm_control_panel.arm_home')]]
          </paper-button>
          <paper-button raised on-click="_callService" data-service="alarm_arm_away" disabled="[[!_codeValid]]">
            [[localize('ui.card.alarm_control_panel.arm_away')]]
          </paper-button>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: '_stateObjChanged'
      },
      _enteredCode: {
        type: String,
        value: ''
      },
      _codeFormat: {
        type: String,
        value: ''
      },
      _codeValid: {
        type: Boolean,
        computed: '_validateCode(_enteredCode, _codeFormat)'
      },
      _disarmVisible: {
        type: Boolean,
        value: false
      },
      _armVisible: {
        type: Boolean,
        value: false
      },
      _inputEnabled: {
        type: Boolean,
        value: false
      }
    };
  }

  constructor() {
    super();
    this._armedStates = ['armed_home', 'armed_away', 'armed_night', 'armed_custom_bypass'];
  }

  _stateObjChanged(newVal, oldVal) {
    if (newVal) {
      const state = newVal.state;
      const props = {
        _codeFormat: newVal.attributes.code_format,
        _armVisible: state === 'disarmed',
        _disarmVisible: this._armedStates.includes(state) ||
          state === 'pending' || state === 'triggered'
      };
      props._inputEnabled = props._disarmVisible || props._armVisible;
      this.setProperties(props);
    }
    if (oldVal) {
      setTimeout(() => {
        this.fire('iron-resize');
      }, 500);
    }
  }

  _isNumber(format) {
    return format === 'Number';
  }

  _validateCode(code, format) {
    return !format || code.length > 0;
  }

  _digitClicked(ev) {
    this._enteredCode += ev.target.getAttribute('data-digit');
  }

  _clearEnteredCode() {
    this._enteredCode = '';
  }

  _callService(ev) {
    const service = ev.target.getAttribute('data-service');
    const data = {
      entity_id: this.stateObj.entity_id,
      code: this._enteredCode
    };
    this.hass.callService('alarm_control_panel', service, data)
      .then(() => {
        this._enteredCode = '';
      });
  }
}
customElements.define('more-info-alarm_control_panel', MoreInfoAlarmControlPanel);
