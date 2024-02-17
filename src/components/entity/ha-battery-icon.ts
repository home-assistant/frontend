import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { batteryLevelIcon } from "../../common/entity/battery_icon";
import "../ha-icon";

@customElement("ha-battery-icon")
export class HaBatteryIcon extends LitElement {
  @property({ attribute: false }) public batteryStateObj?: HassEntity;

  @property({ attribute: false }) public batteryChargingStateObj?: HassEntity;

  protected render() {
    if (!this.batteryStateObj) return nothing;

    return html`
      <ha-icon
        .icon=${batteryLevelIcon(
          this.batteryStateObj.state,
          this.batteryChargingStateObj?.state === "on"
        )}
      ></ha-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-battery-icon": HaBatteryIcon;
  }
}
