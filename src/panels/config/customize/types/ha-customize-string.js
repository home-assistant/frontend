import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { formatAttributeName } from "../../../../util/hass-attributes-util";

class HaCustomizeString extends PolymerElement {
  static get template() {
    return html`
      <paper-input
        disabled="[[item.secondary]]"
        label="[[getLabel(item)]]"
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

  getLabel(item) {
    return (
      formatAttributeName(item.description) +
      (item.type === "json" ? " (JSON formatted)" : "")
    );
  }
}
customElements.define("ha-customize-string", HaCustomizeString);
