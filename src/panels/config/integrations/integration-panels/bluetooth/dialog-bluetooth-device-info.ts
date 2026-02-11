import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-wa-dialog";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import type { BluetoothDeviceInfoDialogParams } from "./show-dialog-bluetooth-device-info";

@customElement("dialog-bluetooth-device-info")
class DialogBluetoothDeviceInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: BluetoothDeviceInfoDialogParams;

  @state() private _open = false;

  public async showDialog(
    params: BluetoothDeviceInfoDialogParams
  ): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public showDataAsHex(bytestring: string): string {
    const bytes = bytestring.match(/.{2}/g) ?? [];
    return bytes.map((byte) => `0x${byte.toUpperCase()}`).join(" ");
  }

  private async _copyToClipboard(): Promise<void> {
    if (!this._params) {
      return;
    }

    await copyToClipboard(JSON.stringify(this._params!.entry));
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.bluetooth.device_information"
        )}
        @closed=${this._dialogClosed}
      >
        <p>
          <b>${this.hass.localize("ui.panel.config.bluetooth.address")}</b>:
          ${this._params.entry.address}
          <br />
          <b>${this.hass.localize("ui.panel.config.bluetooth.name")}</b>:
          ${this._params.entry.name}
          <br />
          <b>${this.hass.localize("ui.panel.config.bluetooth.source")}</b>:
          ${this._params.entry.source}
        </p>

        <h3>
          ${this.hass.localize("ui.panel.config.bluetooth.advertisement_data")}
        </h3>
        <h4>
          ${this.hass.localize("ui.panel.config.bluetooth.manufacturer_data")}
        </h4>
        <table width="100%">
          <tbody>
            ${Object.entries(this._params.entry.manufacturer_data).map(
              ([key, value]) => html`
                <tr>
                  <td><b>${key}</b></td>
                  <td>${this.showDataAsHex(value)}</td>
                </tr>
              `
            )}
          </tbody>
        </table>

        <h4>${this.hass.localize("ui.panel.config.bluetooth.service_data")}</h4>
        <table width="100%">
          <tbody>
            ${Object.entries(this._params.entry.service_data).map(
              ([key, value]) => html`
                <tr>
                  <td><b>${key}</b></td>
                  <td>${this.showDataAsHex(value)}</td>
                </tr>
              `
            )}
          </tbody>
        </table>

        <h4>
          ${this.hass.localize("ui.panel.config.bluetooth.service_uuids")}
        </h4>
        <table width="100%">
          <tbody>
            ${this._params.entry.service_uuids.map(
              (uuid) => html`
                <tr>
                  <td>${uuid}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._copyToClipboard}
          >
            ${this.hass.localize("ui.panel.config.bluetooth.copy_to_clipboard")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-bluetooth-device-info": DialogBluetoothDeviceInfo;
  }
}
