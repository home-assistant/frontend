import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { formatNumber } from "../common/number/format_number";
import LocalizeMixin from "../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HaWaterHeaterState extends LocalizeMixin(PolymerElement) {
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
        }

        .label {
          direction: ltr;
          display: inline-block;
        }
      </style>

      <div class="target">
        <span class="state-label label"> [[_localizeState(stateObj)]] </span>
        <span class="label">[[computeTarget(hass, stateObj)]]</span>
      </div>

      <template is="dom-if" if="[[currentStatus]]">
        <div class="current">
          [[localize('ui.card.water_heater.currently')]]: [[currentStatus]]
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
    };
  }

  computeTarget(hass, stateObj) {
    if (!hass || !stateObj) return null;
    // We're using "!= null" on purpose so that we match both null and undefined.

    if (
      stateObj.attributes.target_temp_low != null &&
      stateObj.attributes.target_temp_high != null
    ) {
      return `${formatNumber(
        stateObj.attributes.target_temp_low,
        this.hass.locale
      )} – ${formatNumber(
        stateObj.attributes.target_temp_high,
        this.hass.locale
      )} ${hass.config.unit_system.temperature}`;
    }
    if (stateObj.attributes.temperature != null) {
      return `${formatNumber(
        stateObj.attributes.temperature,
        this.hass.locale
      )} ${hass.config.unit_system.temperature}`;
    }

    return "";
  }

  _localizeState(stateObj) {
    return this.hass.formatEntityState(stateObj);
  }
}
customElements.define("ha-water_heater-state", HaWaterHeaterState);
