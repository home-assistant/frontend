import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import type { HomeAssistant } from "../../../../../types";
import type { BluetoothDeviceInfoDialogParams } from "./show-dialog-bluetooth-device-info";
import "../../../../../components/ha-button";
import { showToast } from "../../../../../util/toast";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";

@customElement("dialog-bluetooth-device-info")
class DialogBluetoothDeviceInfo extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: BluetoothDeviceInfoDialogParams;

  public async showDialog(
    params: BluetoothDeviceInfoDialogParams
  ): Promise<void> {
    this._params = params;
  }

  public closeDialog(): boolean {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
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

    const manufacturerCode = this._params.entry.manufacturer_data
      ? Object.keys(this._params.entry.manufacturer_data)[0]
      : undefined;

    const manufacturerName =
      manufacturerCode && this._params.manufacturers[manufacturerCode]
        ? this._params.manufacturers[manufacturerCode]
        : undefined;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.bluetooth.device_information")
        )}
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
          ${manufacturerName
            ? html`
                <br />
                <b>
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.manufacturer"
                  )}</b
                >: ${manufacturerName}
              `
            : nothing}
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

        <ha-button slot="secondaryAction" @click=${this._copyToClipboard}
          >${this.hass.localize(
            "ui.panel.config.bluetooth.copy_to_clipboard"
          )}</ha-button
        >
      </ha-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-bluetooth-device-info": DialogBluetoothDeviceInfo;
  }
}
