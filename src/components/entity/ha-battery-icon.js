import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { batteryIcon } from "../../common/entity/battery_icon";
import "../ha-icon";

class HaBatteryIcon extends PolymerElement {
  static get template() {
    return html`
      <ha-icon
        icon="[[computeIcon(batteryStateObj, batteryChargingStateObj)]]"
      ></ha-icon>
    `;
  }

  static get properties() {
    return {
      batteryStateObj: {
        type: Object,
      },
      batteryChargingStateObj: {
        type: Object,
      },
    };
  }

  computeIcon(batteryStateObj, batteryChargingStateObj) {
    return batteryIcon(batteryStateObj, batteryChargingStateObj);
  }
}

customElements.define("ha-battery-icon", HaBatteryIcon);
