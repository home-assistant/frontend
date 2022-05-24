import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { shouldHandleRequestSelectedEvent } from "../../../../../../common/mwc/handle-request-selected-event";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { HomeAssistant } from "../../../../../../types";
import { showMQTTDeviceDebugInfoDialog } from "./show-dialog-mqtt-device-debug-info";

@customElement("ha-device-actions-mqtt")
export class HaDeviceActionsMqtt extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  protected render(): TemplateResult {
    return html`
      <mwc-list-item @request-selected=${this._showDebugInfo}>
        MQTT Info
      </mwc-list-item>
    `;
  }

  private async _showDebugInfo(ev): Promise<void> {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const device = this.device;
    await showMQTTDeviceDebugInfoDialog(this, { device });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-actions-mqtt": HaDeviceActionsMqtt;
  }
}
