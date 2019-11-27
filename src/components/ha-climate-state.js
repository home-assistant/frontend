import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import LocalizeMixin from "../mixins/localize-mixin";
import { CLIMATE_PRESET_NONE } from "../data/climate";

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

        .unit {
          display: inline-block;
          direction: ltr;
        }
      </style>

      <div class="target">
        <template is="dom-if" if="[[_hasKnownState(stateObj.state)]]">
          <span class="state-label">
            [[_localizeState(localize, stateObj)]]
            <template is="dom-if" if="[[_renderPreset(stateObj.attributes)]]">
              - [[_localizePreset(localize, stateObj.attributes.preset_mode)]]
            </template>
          </span>
        </template>
        <div class="unit">[[computeTarget(hass, stateObj)]]</div>
      </div>

      <template is="dom-if" if="[[currentStatus]]">
        <div class="current">
          [[localize('ui.card.climate.currently')]]:
          <div class="unit">[[currentStatus]]</div>
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
      return `${stateObj.attributes.current_temperature} ${hass.config.unit_system.temperature}`;
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
      return `${stateObj.attributes.target_temp_low}-${stateObj.attributes.target_temp_high} ${hass.config.unit_system.temperature}`;
    }
    if (stateObj.attributes.temperature != null) {
      return `${stateObj.attributes.temperature} ${hass.config.unit_system.temperature}`;
    }
    if (
      stateObj.attributes.target_humidity_low != null &&
      stateObj.attributes.target_humidity_high != null
    ) {
      return `${stateObj.attributes.target_humidity_low}-${stateObj.attributes.target_humidity_high}%`;
    }
    if (stateObj.attributes.humidity != null) {
      return `${stateObj.attributes.humidity} %`;
    }

    return "";
  }

  _hasKnownState(state) {
    return state !== "unknown";
  }

  _localizeState(localize, stateObj) {
    const stateString = localize(`state.climate.${stateObj.state}`);
    return stateObj.attributes.hvac_action
      ? `${localize(
          `state_attributes.climate.hvac_action.${stateObj.attributes.hvac_action}`
        )} (${stateString})`
      : stateString;
  }

  _localizePreset(localize, preset) {
    return localize(`state_attributes.climate.preset_mode.${preset}`) || preset;
  }

  _renderPreset(attributes) {
    return (
      attributes.preset_mode && attributes.preset_mode !== CLIMATE_PRESET_NONE
    );
  }
}
customElements.define("ha-climate-state", HaClimateState);
