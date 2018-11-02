import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";

import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../components/ha-label-badge";

/*
 * @appliesMixin EventsMixin
 */

const Icons = {
  armed_away: "hass:security-lock",
  armed_custom_bypass: "hass:security",
  armed_home: "hass:security-home",
  armed_night: "hass:security-home",
  disarmed: "hass:verified",
  pending: "hass:shield-outline",
  triggered: "hass:bell-ring",
};

class HuiAlarmPanelCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      ha-card {
        padding-bottom: 16px;
        position: relative;
        --alarm-color-disarmed: var(--label-badge-green);
        --alarm-color-pending: var(--label-badge-yellow);
        --alarm-color-triggered: var(--label-badge-red);
        --alarm-color-armed: var(--label-badge-red);
        --alarm-color-autoarm: rgba(0, 153, 255, .1);
        --alarm-state-color: var(--alarm-color-armed);
        --base-unit: 15px;
        font-size: calc(var(--base-unit));
      }
      ha-label-badge {
        --ha-label-badge-color:  var(--alarm-state-color);
        --label-badge-text-color: var(--alarm-state-color);
        color: var(--alarm-state-color);
        position: absolute;
        right: 12px;
        top: 12px;
      }
      .disarmed {
        --alarm-state-color: var(--alarm-color-disarmed);
      }
      .triggered {
        --alarm-state-color: var(--alarm-color-triggered);
        animation: pulse 1s infinite;
      }
      .arming {
        --alarm-state-color: var(--alarm-color-pending);
        animation: pulse 1s infinite;
      }
      .pending {
        --alarm-state-color: var(--alarm-color-pending);
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0% {
          --ha-label-badge-color: var(--alarm-state-color);
        }
        100% {
          --ha-label-badge-color: rgba(255, 153, 0, 0.3);
        }
      }
      paper-input {
        margin: auto;
        max-width: 200px;
        font-size: calc(var(--base-unit));
      }
      .state {
        margin-left: 16px;
        font-size: calc(var(--base-unit) * 0.9);
        position: relative;
        bottom: 16px;
        color: var(--alarm-state-color);
        animation: none;
      }
      #keypad {
        display: flex;
        justify-content: center;
      }
      #keypad div {
        display: flex;
        flex-direction: column;
      }
      #keypad paper-button {
        margin-bottom: 10%;
        position: relative;
        padding: calc(var(--base-unit));
        font-size: calc(var(--base-unit) * 1.1);
      }
      .actions {
        margin: 0 8px;
        padding-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        font-size: calc(var(--base-unit) * 1);
      }
      .actions paper-button {
        min-width: calc(var(--base-unit) * 9);
        color: var(--primary-color);
      }
      paper-button#disarm {
        color: var(--google-red-500);
      }
      .not-found {
        flex: 1;
        background-color: yellow;
        padding: 8px;
      }
    </style>
    <ha-card
      header$="[[_computeHeader(localize, _stateObj)]]"
      class$="[[_computeClassName(_stateObj)]]"
    >
      <template is="dom-if" if="[[_stateObj]]">
        <ha-label-badge
          class$="[[_stateObj.state]]"
          icon="[[_computeIcon(_stateObj)]]"
          label="[[_stateIconLabel(_stateObj.state)]]"
        ></ha-label-badge>
        <template is="dom-if" if="[[_showActionToggle(_stateObj.state)]]">
          <div id="armActions" class="actions">
            <template is="dom-repeat" items="[[_config.states]]">
              <paper-button noink raised id="[[item]]" on-click="_handleActionClick">[[_label(localize, item)]]</paper-button>
            </template>
          </div>
        </template>
        <template is="dom-if" if="[[!_showActionToggle(_stateObj.state)]]">
          <div id="disarmActions" class="actions">
            <paper-button noink raised id="disarm" on-click="_handleActionClick">[[_label(localize, "disarm")]]</paper-button>
          </div>
        </template>
        <paper-input label="Alarm Code" type="password" value="[[_value]]"></paper-input>
        <div id="keypad">
          <div>
            <paper-button noink raised value="1" on-click="_handlePadClick">1</paper-button>
            <paper-button noink raised value="4" on-click="_handlePadClick">4</paper-button>
            <paper-button noink raised value="7" on-click="_handlePadClick">7</paper-button>
          </div>
          <div>
            <paper-button noink raised value="2" on-click="_handlePadClick">2</paper-button>
            <paper-button noink raised value="5" on-click="_handlePadClick">5</paper-button>
            <paper-button noink raised value="8" on-click="_handlePadClick">8</paper-button>
            <paper-button noink raised value="0" on-click="_handlePadClick">0</paper-button>
          </div>
          <div>
            <paper-button noink raised value="3" on-click="_handlePadClick">3</paper-button>
            <paper-button noink raised value="6" on-click="_handlePadClick">6</paper-button>
            <paper-button noink raised value="9" on-click="_handlePadClick">9</paper-button>
            <paper-button noink raised value="clear" on-click="_handlePadClick">[[_label(localize, "clear_code")]]</paper-button>
          </div>
      </template>
      <template is="dom-if" if="[[!_stateObj]]">
        <div>Entity not available: [[_config.entity]]</div>
      </template>
    </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
      },
      _value: {
        type: String,
        value: "",
      },
    };
  }

  getCardSize() {
    return 4;
  }

  setConfig(config) {
    if (
      !config ||
      !config.entity ||
      config.entity.split(".")[0] !== "alarm_control_panel"
    ) {
      throw new Error("Invalid card configuration");
    }

    const defaults = {
      states: ["arm_away", "arm_home"],
    };

    this._config = { ...defaults, ...config };
    this._icons = Icons;
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  _computeHeader(localize, stateObj) {
    if (!stateObj) return "";
    return this._config.title
      ? this._config.title
      : this._label(localize, stateObj.state);
  }

  _computeIcon(stateObj) {
    return this._icons[stateObj.state] || "hass:shield-outline";
  }

  _label(localize, state) {
    return (
      localize(`state.alarm_control_panel.${state}`) ||
      localize(`ui.card.alarm_control_panel.${state}`)
    );
  }

  _stateIconLabel(state) {
    const stateLabel = state.split("_").pop();
    return stateLabel === "disarmed" || stateLabel === "triggered"
      ? ""
      : stateLabel;
  }

  _showActionToggle(state) {
    return state === "disarmed";
  }

  _computeClassName(stateObj) {
    if (!stateObj) return "not-found";
    return "";
  }

  _handlePadClick(e) {
    const val = e.target.getAttribute("value");
    this._value = val === "clear" ? "" : this._value + val;
  }

  _handleActionClick(e) {
    this.hass.callService("alarm_control_panel", "alarm_" + e.target.id, {
      entity_id: this._stateObj.entity_id,
      code: this._value,
    });
    this._value = "";
  }
}

customElements.define("hui-alarm-panel-card", HuiAlarmPanelCard);
