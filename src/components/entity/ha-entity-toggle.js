import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-toggle-button/paper-toggle-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { STATES_OFF } from "../../common/const";
import computeStateDomain from "../../common/entity/compute_state_domain";

class HaEntityToggle extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          white-space: nowrap;
          min-width: 38px;
        }
        paper-icon-button {
          color: var(
            --paper-icon-button-inactive-color,
            var(--primary-text-color)
          );
          transition: color 0.5s;
        }
        paper-icon-button[state-active] {
          color: var(--paper-icon-button-active-color, var(--primary-color));
        }
        paper-toggle-button {
          cursor: pointer;
          --paper-toggle-button-label-spacing: 0;
          padding: 13px 5px;
          margin: -4px -5px;
        }
      </style>

      <template is="dom-if" if="[[stateObj.attributes.assumed_state]]">
        <paper-icon-button
          icon="hass:flash-off"
          on-click="turnOff"
          state-active$="[[!isOn]]"
        ></paper-icon-button>
        <paper-icon-button
          icon="hass:flash"
          on-click="turnOn"
          state-active$="[[isOn]]"
        ></paper-icon-button>
      </template>
      <template is="dom-if" if="[[!stateObj.attributes.assumed_state]]">
        <paper-toggle-button
          checked="[[toggleChecked]]"
          on-change="toggleChanged"
        ></paper-toggle-button>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: "stateObjObserver",
      },

      toggleChecked: {
        type: Boolean,
        value: false,
      },

      isOn: {
        type: Boolean,
        computed: "computeIsOn(stateObj)",
        observer: "isOnChanged",
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("click", (ev) => this.onTap(ev));
    this.forceStateChange();
  }

  onTap(ev) {
    ev.stopPropagation();
  }

  toggleChanged(ev) {
    const newVal = ev.target.checked;

    if (newVal && !this.isOn) {
      this.callService(true);
    } else if (!newVal && this.isOn) {
      this.callService(false);
    }
  }

  isOnChanged(newVal) {
    this.toggleChecked = newVal;
  }

  forceStateChange() {
    if (this.toggleChecked === this.isOn) {
      this.toggleChecked = !this.toggleChecked;
    }
    this.toggleChecked = this.isOn;
  }

  turnOn() {
    this.callService(true);
  }

  turnOff() {
    this.callService(false);
  }

  computeIsOn(stateObj) {
    return stateObj && !STATES_OFF.includes(stateObj.state);
  }

  stateObjObserver(newVal, oldVal) {
    if (!oldVal || !newVal) return;
    if (this.computeIsOn(newVal) === this.computeIsOn(oldVal)) {
      // stateObj changed but isOn is the same. Make sure toggle is in the right position.
      this.forceStateChange();
    }
  }

  // We call updateToggle after a successful call to re-sync the toggle
  // with the state. It will be out of sync if our service call did not
  // result in the entity to be turned on. Since the state is not changing,
  // the resync is not called automatic.
  callService(turnOn) {
    const stateDomain = computeStateDomain(this.stateObj);
    let serviceDomain;
    let service;

    if (stateDomain === "lock") {
      serviceDomain = "lock";
      service = turnOn ? "unlock" : "lock";
    } else if (stateDomain === "cover") {
      serviceDomain = "cover";
      service = turnOn ? "open_cover" : "close_cover";
    } else if (stateDomain === "group") {
      serviceDomain = "homeassistant";
      service = turnOn ? "turn_on" : "turn_off";
    } else {
      serviceDomain = stateDomain;
      service = turnOn ? "turn_on" : "turn_off";
    }

    const currentState = this.stateObj;
    this.hass
      .callService(serviceDomain, service, {
        entity_id: this.stateObj.entity_id,
      })
      .then(() => {
        setTimeout(() => {
          // If after 2 seconds we have not received a state update
          // reset the switch to it's original state.
          if (this.stateObj === currentState) {
            this.forceStateChange();
          }
        }, 2000);
      });
  }
}

customElements.define("ha-entity-toggle", HaEntityToggle);
