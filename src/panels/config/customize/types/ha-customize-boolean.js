import "@polymer/paper-checkbox";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

class HaCustomizeBoolean extends PolymerElement {
  static get template() {
    return html`
      <paper-checkbox disabled="[[item.secondary]]" checked="{{item.value}}">
        [[item.description]]
      </paper-checkbox>
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
customElements.define("ha-customize-boolean", HaCustomizeBoolean);
