import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/entity/state-info";

import LocalizeMixin from "../mixins/localize-mixin";

import { attributeClassNames } from "../common/entity/attribute_class_names";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeRTL } from "../common/util/compute_rtl";

/*
 * @appliesMixin LocalizeMixin
 */
class StateCardDisplay extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          @apply --layout-horizontal;
          @apply --layout-justified;
          @apply --layout-baseline;
        }

        :host([rtl]) {
          direction: rtl;
          text-align: right;
        }

        state-info {
          flex: 1 1 auto;
          min-width: 0;
        }
        .state {
          @apply --paper-font-body1;
          color: var(--primary-text-color);
          margin-left: 16px;
          text-align: right;
          max-width: 40%;
          flex: 0 0 auto;
          overflow-wrap: break-word;
        }
        :host([rtl]) .state {
          margin-right: 16px;
          margin-left: 0;
          text-align: left;
        }

        .state.has-unit_of_measurement {
          white-space: nowrap;
        }
      </style>

      ${this.stateInfoTemplate}
      <div class$="[[computeClassNames(stateObj)]]">
        [[computeStateDisplay(localize, stateObj, language)]]
      </div>
    `;
  }

  static get stateInfoTemplate() {
    return html`
      <state-info
        hass="[[hass]]"
        state-obj="[[stateObj]]"
        in-dialog="[[inDialog]]"
      ></state-info>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  computeStateDisplay(localize, stateObj, language) {
    return computeStateDisplay(localize, stateObj, language);
  }

  computeClassNames(stateObj) {
    const classes = [
      "state",
      attributeClassNames(stateObj, ["unit_of_measurement"]),
    ];
    return classes.join(" ");
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}
customElements.define("state-card-display", StateCardDisplay);
