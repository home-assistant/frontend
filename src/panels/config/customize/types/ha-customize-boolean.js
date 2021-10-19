import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";

class HaCustomizeBoolean extends PolymerElement {
  static get template() {
    return html`
      <ha-formfield label="[[item.description]]">
        <ha-checkbox
          disabled="[[item.secondary]]"
          checked="[[item.value]]"
          on-change="checkedChanged"
        >
        </ha-checkbox
      ></ha-formfield>
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

  checkedChanged(ev) {
    this.item.value = ev.target.checked;
  }
}
customElements.define("ha-customize-boolean", HaCustomizeBoolean);
