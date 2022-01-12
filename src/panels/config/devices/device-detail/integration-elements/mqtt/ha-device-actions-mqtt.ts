import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { removeMQTTDeviceEntry } from "../../../../../../data/mqtt";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { showMQTTDeviceDebugInfoDialog } from "./show-dialog-mqtt-device-debug-info";

@customElement("ha-device-actions-mqtt")
export class HaDeviceActionsMqtt extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  protected render(): TemplateResult {
    return html`
      <mwc-button @click=${this._showDebugInfo}> MQTT Info </mwc-button>
      <mwc-button class="warning" @click=${this._confirmDeleteEntry}>
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          justify-content: space-between;
        }
      `,
    ];
  }
}
