import { MutableData } from "@polymer/polymer/lib/mixins/mutable-data.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "./ha-customize-attribute.js";

class HaFormCustomizeAttributes extends MutableData(PolymerElement) {
  static get template() {
    return html`
    <style>
      [hidden] {
        display: none;
      }
    </style>
    <template is="dom-repeat" items="{{attributes}}" mutable-data="">
      <ha-customize-attribute item="{{item}}" hidden$="[[item.closed]]">
      </ha-customize-attribute>
    </template>
`;
  }

  static get properties() {
    return {
      attributes: {
        type: Array,
        notify: true,
      },
    };
  }
}
customElements.define(
  "ha-form-customize-attributes",
  HaFormCustomizeAttributes
);
