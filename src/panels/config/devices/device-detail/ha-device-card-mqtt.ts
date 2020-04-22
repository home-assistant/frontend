import { DeviceRegistryEntry } from "../../../../data/device_registry";
import { removeMQTTDeviceEntry } from "../../../../data/mqtt";
import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  CSSResult,
} from "lit-element";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { showMQTTDeviceDebugInfoDialog } from "../../../../dialogs/mqtt-device-debug-info-dialog/show-dialog-mqtt-device-debug-info";
import { HomeAssistant } from "../../../../types";
import { haStyle } from "../../../../resources/styles";

@customElement("ha-device-card-mqtt")
export class HaDeviceCardMqtt extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  protected render(): TemplateResult {
    return html`
      <mwc-button @click=${this._showDebugInfo}>
        MQTT Info
      </mwc-button>
      <mwc-button class="warning" @click="${this._confirmDeleteEntry}">
        ${this.hass.localize("ui.panel.config.devices.delete")}
      </mwc-button>
    `;
  }

  private async _confirmDeleteEntry(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.devices.confirm_delete"),
    });

    if (!confirmed) {
      return;
    }

    await removeMQTTDeviceEntry(this.hass!, this.device.id);
  }

  private async _showDebugInfo(): Promise<void> {
    const device = this.device;
    await showMQTTDeviceDebugInfoDialog(this, { device });
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}
