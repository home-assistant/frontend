import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../components/entity/state-info.js";
import LocalizeMixin from "../mixins/localize-mixin.js";

import computeStateDisplay from "../common/entity/compute_state_display.js";
import attributeClassNames from "../common/entity/attribute_class_names.js";

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
      }
      .state.has-unit_of_measurement {
        white-space: nowrap;
      }
    </style>

    ${this.stateInfoTemplate}
    <div class$="[[computeClassNames(stateObj)]]">[[computeStateDisplay(localize, stateObj, language)]]</div>
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
}
customElements.define("state-card-display", StateCardDisplay);
