import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { stateIcon } from "../../common/entity/state_icon";
import "../ha-icon";

class HaStateIcon extends PolymerElement {
  static get template() {
    return html` <ha-icon icon="[[computeIcon(stateObj)]]"></ha-icon> `;
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
