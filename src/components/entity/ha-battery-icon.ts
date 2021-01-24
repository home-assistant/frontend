import { customElement, html, LitElement, property } from "lit-element";
import { batteryIcon } from "../../common/entity/battery_icon";
import "../ha-icon";

@customElement("ha-battery-icon")
export class HaBatteryIcon extends LitElement {
  @property() public batteryStateObj;

  @property() public batteryChargingStateObj;

  protected render() {
    return html`
      <ha-icon
        .icon=${batteryIcon(this.batteryStateObj, this.batteryChargingStateObj)}
      ></ha-icon>
    `;
  }
}
