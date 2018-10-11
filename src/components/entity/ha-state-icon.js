import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../ha-icon.js";
import stateIcon from "../../common/entity/state_icon.js";

class HaStateIcon extends PolymerElement {
  static get template() {
    return html`<ha-icon icon="[[computeIcon(stateObj)]]"></ha-icon>`;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }

  computeIcon(stateObj) {
    return stateIcon(stateObj);
  }
}

customElements.define("ha-state-icon", HaStateIcon);
