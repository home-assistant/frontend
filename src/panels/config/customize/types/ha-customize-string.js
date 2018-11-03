import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class HaCustomizeString extends PolymerElement {
  static get template() {
    return html`
    <paper-input disabled="[[item.secondary]]" label="[[getLabel(item)]]" value="{{item.value}}">
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
    return item.description + (item.type === "json" ? " (JSON formatted)" : "");
  }
}
customElements.define("ha-customize-string", HaCustomizeString);
