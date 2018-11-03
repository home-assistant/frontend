import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import LocalizeMixin from "../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HaClimateState extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        white-space: nowrap;
      }

      .target {
        color: var(--primary-text-color);
      }

      .current {
        color: var(--secondary-text-color);
      }

      .state-label {
        font-weight: bold;
        text-transform: capitalize;
      }
    </style>

    <div class="target">
      <template is="dom-if" if="[[_hasKnownState(stateObj.state)]]">
        <span class="state-label">
          [[_localizeState(stateObj.state)]]
        </span>
      </template>
      [[computeTarget(hass, stateObj)]]
    </div>

    <template is="dom-if" if="[[currentStatus]]">
      <div class="current">
        [[localize('ui.card.climate.currently')]]: [[currentStatus]]
      </div>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      currentStatus: {
        type: String,
        computed: "computeCurrentStatus(hass, stateObj)",
      },
    };
  }

  computeCurrentStatus(hass, stateObj) {
    if (!hass || !stateObj) return null;
    if (stateObj.attributes.current_temperature != null) {
      return `${stateObj.attributes.current_temperature} ${
        hass.config.unit_system.temperature
      }`;
    }
    if (stateObj.attributes.current_humidity != null) {
      return `${stateObj.attributes.current_humidity} %`;
    }
    return null;
  }

  computeTarget(hass, stateObj) {
    if (!hass || !stateObj) return null;
    // We're using "!= null" on purpose so that we match both null and undefined.
    if (
      stateObj.attributes.target_temp_low != null &&
      stateObj.attributes.target_temp_high != null
    ) {
      return `${stateObj.attributes.target_temp_low} - ${
        stateObj.attributes.target_temp_high
      } ${hass.config.unit_system.temperature}`;
    }
    if (stateObj.attributes.temperature != null) {
      return `${stateObj.attributes.temperature} ${
        hass.config.unit_system.temperature
      }`;
    }
    if (
      stateObj.attributes.target_humidity_low != null &&
      stateObj.attributes.target_humidity_high != null
    ) {
      return `${stateObj.attributes.target_humidity_low} - ${
        stateObj.attributes.target_humidity_high
      } %`;
    }
    if (stateObj.attributes.humidity != null) {
      return `${stateObj.attributes.humidity} %`;
    }

    return "";
  }

  _hasKnownState(state) {
    return state !== "unknown";
  }

  _localizeState(state) {
    return this.localize(`state.climate.${state}`) || state;
  }
}
customElements.define("ha-climate-state", HaClimateState);
