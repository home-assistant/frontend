import { DeviceRegistryEntry } from "../../../../data/device_registry";
import { removeMQTTDeviceEntry } from "../../../../data/mqtt";
import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../../types";

@customElement("ha-device-card-mqtt")
export class HaDeviceCardMqtt extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public device!: DeviceRegistryEntry;

  protected render(): TemplateResult {
    return html`
      <mwc-button class="warning" @click="${this._confirmDeleteEntry}">
        ${this.hass.localize("ui.panel.config.devices.delete")}
      </mwc-button>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
  }

  private async _deleteEntry(): Promise<void> {
    await removeMQTTDeviceEntry(this.hass!, this.device.id);
  }

  private _confirmDeleteEntry(): void {
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.devices.confirm_delete"),
      confirm: () => this._deleteEntry(),
    });
  }

  static get styles(): CSSResult {
    return css`
      mwc-button.warning {
        margin-right: auto;
        --mdc-theme-primary: var(--google-red-500);
      }
    `;
  }
}
