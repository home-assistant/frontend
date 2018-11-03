import "@polymer/paper-button/paper-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import LocalizeMixin from "../mixins/localize-mixin";

const STATES_INTERCEPTABLE = {
  cleaning: {
    action: "return_to_base",
    service: "return_to_base",
  },
  docked: {
    action: "start_cleaning",
    service: "start",
  },
  idle: {
    action: "start_cleaning",
    service: "start",
  },
  off: {
    action: "turn_on",
    service: "turn_on",
  },
  on: {
    action: "turn_off",
    service: "turn_off",
  },
  paused: {
    action: "resume_cleaning",
    service: "start",
  },
};

/*
 * @appliesMixin LocalizeMixin
 */
class HaVacuumState extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          top: 3px;
          height: 37px;
          margin-right: -.57em;
        }
        paper-button[disabled] {
          background-color: transparent;
          color: var(--secondary-text-color);
        }
      </style>

      <paper-button
        on-click="_callService"
        disabled="[[!_interceptable]]"
      >[[_computeLabel(stateObj.state, _interceptable)]]</paper-button>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      _interceptable: {
        type: Boolean,
        computed:
          "_computeInterceptable(stateObj.state, stateObj.attributes.supported_features)",
      },
    };
  }

  _computeInterceptable(state, supportedFeatures) {
    return state in STATES_INTERCEPTABLE && supportedFeatures !== 0;
  }

  _computeLabel(state, interceptable) {
    return interceptable
      ? this.localize(
          `ui.card.vacuum.actions.${STATES_INTERCEPTABLE[state].action}`
        )
      : this.localize(`state.vacuum.${state}`);
  }

  _callService(ev) {
    ev.stopPropagation();
    const stateObj = this.stateObj;
    const service = STATES_INTERCEPTABLE[stateObj.state].service;
    this.hass.callService("vacuum", service, { entity_id: stateObj.entity_id });
  }
}
customElements.define("ha-vacuum-state", HaVacuumState);
