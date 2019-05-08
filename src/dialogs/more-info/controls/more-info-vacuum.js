import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-attributes";
import "../../../components/ha-paper-dropdown-menu";
import { supportsFeature } from "../../../common/entity/supports-feature";

class MoreInfoVacuum extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        :host {
          @apply --paper-font-body1;
          line-height: 1.5;
        }

        .status-subtitle {
          color: var(--secondary-text-color);
        }

        paper-item {
          cursor: pointer;
        }
      </style>

      <div class="horizontal justified layout">
        <div hidden$="[[!supportsStatus(stateObj)]]">
          <span class="status-subtitle">Status: </span
          ><span><strong>[[stateObj.attributes.status]]</strong></span>
        </div>
        <div hidden$="[[!supportsBattery(stateObj)]]">
          <span
            ><iron-icon icon="[[stateObj.attributes.battery_icon]]"></iron-icon>
            [[stateObj.attributes.battery_level]] %</span
          >
        </div>
      </div>
      <div hidden$="[[!supportsCommandBar(stateObj)]]">
        <p></p>
        <div class="status-subtitle">Vacuum cleaner commands:</div>
        <div class="horizontal justified layout">
          <template is="dom-if" if="[[supportsStart(stateObj)]]">
            <div>
              <paper-icon-button
                icon="hass:play"
                on-click="onStart"
                title="Start"
              ></paper-icon-button>
            </div>
            <div hidden$="[[!supportsPause(stateObj)]]">
              <paper-icon-button
                icon="hass:pause"
                on-click="onPause"
                title="Pause"
              ></paper-icon-button>
            </div>
          </template>
          <template is="dom-if" if="[[!supportsStart(stateObj)]]">
            <div hidden$="[[!supportsPause(stateObj)]]">
              <paper-icon-button
                icon="hass:play-pause"
                on-click="onPlayPause"
                title="Pause"
              ></paper-icon-button>
            </div>
          </template>

          <div hidden$="[[!supportsStop(stateObj)]]">
            <paper-icon-button
              icon="hass:stop"
              on-click="onStop"
              title="Stop"
            ></paper-icon-button>
          </div>
          <div hidden$="[[!supportsCleanSpot(stateObj)]]">
            <paper-icon-button
              icon="hass:broom"
              on-click="onCleanSpot"
              title="Clean spot"
            ></paper-icon-button>
          </div>
          <div hidden$="[[!supportsLocate(stateObj)]]">
            <paper-icon-button
              icon="hass:map-marker"
              on-click="onLocate"
              title="Locate"
            ></paper-icon-button>
          </div>
          <div hidden$="[[!supportsReturnHome(stateObj)]]">
            <paper-icon-button
              icon="hass:home-map-marker"
              on-click="onReturnHome"
              title="Return home"
            ></paper-icon-button>
          </div>
        </div>
      </div>

      <div hidden$="[[!supportsFanSpeed(stateObj)]]">
        <div class="horizontal justified layout">
          <ha-paper-dropdown-menu
            label-float=""
            dynamic-align=""
            label="Fan speed"
          >
            <paper-listbox
              slot="dropdown-content"
              selected="[[stateObj.attributes.fan_speed]]"
              on-selected-changed="fanSpeedChanged"
              attr-for-selected="item-name"
            >
              <template
                is="dom-repeat"
                items="[[stateObj.attributes.fan_speed_list]]"
              >
                <paper-item item-name$="[[item]]">[[item]]</paper-item>
              </template>
            </paper-listbox>
          </ha-paper-dropdown-menu>
          <div
            style="justify-content: center; align-self: center; padding-top: 1.3em"
          >
            <span
              ><iron-icon icon="hass:fan"></iron-icon>
              [[stateObj.attributes.fan_speed]]</span
            >
          </div>
        </div>
        <p></p>
      </div>
      <ha-attributes
        state-obj="[[stateObj]]"
        extra-filters="fan_speed,fan_speed_list,status,battery_level,battery_icon"
      ></ha-attributes>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      inDialog: {
        type: Boolean,
        value: false,
      },

      stateObj: {
        type: Object,
      },
    };
  }

  supportsPause(stateObj) {
    return supportsFeature(stateObj, 4);
  }

  supportsStop(stateObj) {
    return supportsFeature(stateObj, 8);
  }

  supportsReturnHome(stateObj) {
    return supportsFeature(stateObj, 16);
  }

  supportsFanSpeed(stateObj) {
    return supportsFeature(stateObj, 32);
  }

  supportsBattery(stateObj) {
    return supportsFeature(stateObj, 64);
  }

  supportsStatus(stateObj) {
    return supportsFeature(stateObj, 128);
  }

  supportsLocate(stateObj) {
    return supportsFeature(stateObj, 512);
  }

  supportsCleanSpot(stateObj) {
    return supportsFeature(stateObj, 1024);
  }

  supportsStart(stateObj) {
    return supportsFeature(stateObj, 8192);
  }

  supportsCommandBar(stateObj) {
    return (
      supportsFeature(stateObj, 4) |
      supportsFeature(stateObj, 8) |
      supportsFeature(stateObj, 16) |
      supportsFeature(stateObj, 512) |
      supportsFeature(stateObj, 1024) |
      supportsFeature(stateObj, 8192)
    );
  }

  fanSpeedChanged(ev) {
    var oldVal = this.stateObj.attributes.fan_speed;
    var newVal = ev.detail.value;

    if (!newVal || oldVal === newVal) return;

    this.hass.callService("vacuum", "set_fan_speed", {
      entity_id: this.stateObj.entity_id,
      fan_speed: newVal,
    });
  }

  onStop() {
    this.hass.callService("vacuum", "stop", {
      entity_id: this.stateObj.entity_id,
    });
  }

  onPlayPause() {
    this.hass.callService("vacuum", "start_pause", {
      entity_id: this.stateObj.entity_id,
    });
  }

  onPause() {
    this.hass.callService("vacuum", "pause", {
      entity_id: this.stateObj.entity_id,
    });
  }

  onStart() {
    this.hass.callService("vacuum", "start", {
      entity_id: this.stateObj.entity_id,
    });
  }

  onLocate() {
    this.hass.callService("vacuum", "locate", {
      entity_id: this.stateObj.entity_id,
    });
  }

  onCleanSpot() {
    this.hass.callService("vacuum", "clean_spot", {
      entity_id: this.stateObj.entity_id,
    });
  }

  onReturnHome() {
    this.hass.callService("vacuum", "return_to_base", {
      entity_id: this.stateObj.entity_id,
    });
  }
}

customElements.define("more-info-vacuum", MoreInfoVacuum);
