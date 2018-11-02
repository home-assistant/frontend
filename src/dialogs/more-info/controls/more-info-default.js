import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-attributes";

class MoreInfoDefault extends PolymerElement {
  static get template() {
    return html`
    <ha-attributes state-obj="[[stateObj]]"></ha-attributes>
`;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }
}

customElements.define("more-info-default", MoreInfoDefault);
