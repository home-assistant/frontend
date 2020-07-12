import { batteryIcon } from "../../common/entity/battery_icon";
import "../ha-icon";
import { customElement, html, property, LitElement } from "lit-element";

@customElement("ha-battery-icon")
class HaBatteryIcon extends LitElement {
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

customElements.define("ha-battery-icon", HaBatteryIcon);
