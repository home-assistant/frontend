import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { removeTasmotaDeviceEntry } from "../../../../../../data/tasmota";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-actions-tasmota")
export class HaDeviceActionsTasmota extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  protected render(): TemplateResult {
    return html`
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

    await removeTasmotaDeviceEntry(this.hass!, this.device.id);
  }

  static get styles(): CSSResult[] {
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
