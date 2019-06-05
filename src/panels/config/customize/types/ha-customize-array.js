import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { EventsMixin } from "../../../../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class HaCustomizeArray extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-dropdown-menu {
          margin: -9px 0;
        }
      </style>
      <paper-dropdown-menu
        label="[[item.description]]"
        disabled="[[item.secondary]]"
        selected-item-label="{{item.value}}"
        dynamic-align=""
      >
        <paper-listbox
          slot="dropdown-content"
          selected="[[computeSelected(item)]]"
        >
          <template is="dom-repeat" items="[[getOptions(item)]]" as="option">
            <paper-item>[[option]]</paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  static get properties() {
    return {
      item: {
        type: Object,
        notifies: true,
      },
    };
  }

  getOptions(item) {
    const domain = item.domain || "*";
    const options = item.options[domain] || item.options["*"];
    if (!options) {
      this.item.type = "string";
      this.fire("item-changed");
      return [];
    }
    return options.sort();
  }

  computeSelected(item) {
    const options = this.getOptions(item);
    return options.indexOf(item.value);
  }
}
customElements.define("ha-customize-array", HaCustomizeArray);
