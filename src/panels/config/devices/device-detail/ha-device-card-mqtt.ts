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
import { AreaRegistryEntry } from "../../../../data/area_registry";

@customElement("ha-device-card-mqtt")
export class HaDeviceCardMqtt extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public device!: DeviceRegistryEntry;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public narrow!: boolean;
  @property() public domains!: string[];

  protected render(): TemplateResult {
    return html`
      <div class="info">
        <div class="buttons">
          <mwc-button class="warning" @click="${this._confirmDeleteEntry}">
            ${this.hass.localize("ui.panel.config.devices.delete")}
          </mwc-button>
        </div>
      </div>
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
      ha-card {
        flex: 1 0 100%;
        padding-bottom: 10px;
        min-width: 0;
      }
      .device {
        width: 30%;
      }
      mwc-button.warning {
        margin-right: auto;
        --mdc-theme-primary: var(--google-red-500);
      }
    `;
  }
}
