import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaCustomizeKeyValue extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          @apply --layout-horizontal;
        }
        paper-input {
          @apply --layout-flex;
        }
        .key {
          padding-right: 20px;
        }
      </style>
      <paper-input
        disabled="[[item.secondary]]"
        class="key"
        label="Attribute name"
        value="{{item.attribute}}"
      >
      </paper-input>
      <paper-input
        disabled="[[item.secondary]]"
        label="Attribute value"
        value="{{item.value}}"
      >
      </paper-input>
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
}
customElements.define("ha-customize-key-value", HaCustomizeKeyValue);
