import "@material/mwc-button";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { fireEvent } from "../../../common/dom/fire_event";
import { FORMAT_NUMBER } from "../../../data/alarm_control_panel";
import LocalizeMixin from "../../../mixins/localize-mixin";

class MoreInfoAlarmControlPanel extends LocalizeMixin(PolymerElement) {
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
        .pad mwc-button {
          padding: 8px;
          width: 80px;
        }
        .actions mwc-button {
          flex: 1 0 50%;
          margin: 0 4px 16px;
          max-width: 200px;
        }
        mwc-button.disarm {
          color: var(--error-color);
        }
      </style>

      <template is="dom-if" if="[[_codeFormat]]">
        <paper-input
          label="[[localize('ui.card.alarm_control_panel.code')]]"
          value="{{_enteredCode}}"
          type="password"
          inputmode="[[_inputMode]]"
          disabled="[[!_inputEnabled]]"
        ></paper-input>

        <template is="dom-if" if="[[_isNumber(_codeFormat)]]">
          <div class="pad">
            <div>
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="1"
                outlined
                >1</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="4"
                outlined
                >4</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="7"
                outlined
                >7</mwc-button
              >
            </div>
            <div>
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="2"
                outlined
                >2</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="5"
                outlined
                >5</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="8"
                outlined
                >8</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="0"
                outlined
                >0</mwc-button
              >
            </div>
            <div>
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="3"
                outlined
                >3</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="6"
                outlined
                >6</mwc-button
              >
              <mwc-button
                on-click="_digitClicked"
                disabled="[[!_inputEnabled]]"
                data-digit="9"
                outlined
                >9</mwc-button
              >
              <mwc-button
                on-click="_clearEnteredCode"
                disabled="[[!_inputEnabled]]"
                outlined
              >
                [[localize('ui.card.alarm_control_panel.clear_code')]]
              </mwc-button>
            </div>
          </div>
        </template>
      </template>

      <div class="layout horizontal center-justified actions">
        <template is="dom-if" if="[[_disarmVisible]]">
          <mwc-button
            outlined
            class="disarm"
            on-click="_callService"
            data-service="alarm_disarm"
            disabled="[[!_codeValid]]"
          >
            [[localize('ui.card.alarm_control_panel.disarm')]]
          </mwc-button>
        </template>
        <template is="dom-if" if="[[_armVisible]]">
          <mwc-button
            outlined
            on-click="_callService"
            data-service="alarm_arm_home"
            disabled="[[!_codeValid]]"
          >
            [[localize('ui.card.alarm_control_panel.arm_home')]]
          </mwc-button>
          <mwc-button
            outlined
            on-click="_callService"
            data-service="alarm_arm_away"
            disabled="[[!_codeValid]]"
          >
            [[localize('ui.card.alarm_control_panel.arm_away')]]
          </mwc-button>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: "_stateObjChanged",
      },
      _enteredCode: {
        type: String,
        value: "",
      },
      _codeFormat: {
        type: String,
        value: "",
      },
      _codeValid: {
        type: Boolean,
        computed:
          "_validateCode(_enteredCode,  _codeFormat,  _armVisible, _codeArmRequired)",
      },
      _disarmVisible: {
        type: Boolean,
        value: false,
      },
      _armVisible: {
        type: Boolean,
        value: false,
      },
      _inputEnabled: {
        type: Boolean,
        value: false,
      },
      _inputMode: {
        type: String,
        computed: "_getInputMode(_codeFormat)",
      },
    };
  }

  constructor() {
    super();
    this._armedStates = [
      "armed_home",
      "armed_away",
      "armed_night",
      "armed_custom_bypass",
    ];
  }

  _stateObjChanged(newVal, oldVal) {
    if (newVal) {
      const state = newVal.state;
      const props = {
        _codeFormat: newVal.attributes.code_format,
        _armVisible: state === "disarmed",
        _codeArmRequired: newVal.attributes.code_arm_required,
        _disarmVisible:
          this._armedStates.includes(state) ||
          state === "pending" ||
          state === "triggered" ||
          state === "arming",
      };
      props._inputEnabled = props._disarmVisible || props._armVisible;
      this.setProperties(props);
    }
    if (oldVal) {
      setTimeout(() => {
        fireEvent(this, "iron-resize");
      }, 500);
    }
  }

  _getInputMode(format) {
    return this._isNumber(format) ? "numeric" : "text";
  }

  _isNumber(format) {
    return format === FORMAT_NUMBER;
  }

  _validateCode(code, format, armVisible, codeArmRequired) {
    return !format || code.length > 0 || (armVisible && !codeArmRequired);
  }

  _digitClicked(ev) {
    this._enteredCode += ev.target.getAttribute("data-digit");
  }

  _clearEnteredCode() {
    this._enteredCode = "";
  }

  _callService(ev) {
    const service = ev.target.getAttribute("data-service");
    const data = {
      entity_id: this.stateObj.entity_id,
      code: this._enteredCode,
    };
    this.hass.callService("alarm_control_panel", service, data).then(() => {
      this._enteredCode = "";
    });
  }
}
customElements.define(
  "more-info-alarm_control_panel",
  MoreInfoAlarmControlPanel
);
