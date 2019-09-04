import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import hassAttributeUtil from "../util/hass-attributes-util";

class HaAttributes extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        .data-entry .value {
          max-width: 200px;
          overflow-wrap: break-word;
        }
        .attribution {
          color: var(--secondary-text-color);
          text-align: right;
        }
      </style>

      <div class="layout vertical">
        <template
          is="dom-repeat"
          items="[[computeDisplayAttributes(stateObj, filtersArray)]]"
          as="attribute"
        >
          <div class="data-entry layout justified horizontal">
            <div class="key">[[formatAttribute(attribute)]]</div>
            <div class="value">
              [[formatAttributeValue(stateObj, attribute)]]
            </div>
          </div>
        </template>
        <div class="attribution" hidden$="[[!computeAttribution(stateObj)]]">
          [[computeAttribution(stateObj)]]
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
      extraFilters: {
        type: String,
        value: "",
      },
      filtersArray: {
        type: Array,
        computed: "computeFiltersArray(extraFilters)",
      },
    };
  }

  computeFiltersArray(extraFilters) {
    return Object.keys(hassAttributeUtil.LOGIC_STATE_ATTRIBUTES).concat(
      extraFilters ? extraFilters.split(",") : []
    );
  }

  computeDisplayAttributes(stateObj, filtersArray) {
    if (!stateObj) {
      return [];
    }
    return Object.keys(stateObj.attributes).filter(function(key) {
      return filtersArray.indexOf(key) === -1;
    });
  }

  formatAttribute(attribute) {
    return attribute.replace(/_/g, " ");
  }

  formatAttributeValue(stateObj, attribute) {
    var value = stateObj.attributes[attribute];
    if (value === null) return "-";
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value instanceof Object ? JSON.stringify(value, null, 2) : value;
  }

  computeAttribution(stateObj) {
    return stateObj.attributes.attribution;
  }
}

customElements.define("ha-attributes", HaAttributes);
