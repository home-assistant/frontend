import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
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
    `;
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
