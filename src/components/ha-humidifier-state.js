import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import LocalizeMixin from "../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HaHumidifierState extends LocalizeMixin(PolymerElement) {
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
            [[_localizeState(localize, stateObj.state)]]
            <template is="dom-if" if="[[_renderMode(stateObj.attributes)]]">
              - [[_localizeMode(localize, stateObj.attributes.mode)]]
            </template>
          </span>
        </template>
        <div class="unit">[[computeTarget(stateObj.attributes.humidity)]]</div>
      </div>
    `;
  }

  static get properties() {
    return {
      stateObj: Object,
    };
  }

  computeTarget(humidity) {
    if (humidity != null) {
      return `${humidity} %`;
    }

    return "";
  }

  _hasKnownState(state) {
    return state !== "unknown";
  }

  _localizeState(localize, state) {
    return localize(`state.default.${state}`) || state;
  }

  _localizeMode(localize, mode) {
    return localize(`state_attributes.humidifier.mode.${mode}`) || mode;
  }

  _renderMode(attributes) {
    return attributes.mode;
  }
}
customElements.define("ha-humidifier-state", HaHumidifierState);
