import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { batteryStateIcon } from "../../common/entity/battery_icon";
import "../ha-svg-icon";

@customElement("ha-battery-icon")
export class HaBatteryIcon extends LitElement {
  @property() public batteryStateObj;

  @property() public batteryChargingStateObj;

  protected render() {
    return html`
      <ha-svg-icon
        .path=${batteryStateIcon(
          this.batteryStateObj,
          this.batteryChargingStateObj
        )}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-battery-icon": HaBatteryIcon;
  }
}
