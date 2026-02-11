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
import type { ZeroconfDiscoveryInfoDialogParams } from "./show-dialog-zeroconf-discovery-info";

@customElement("dialog-zeroconf-device-info")
class DialogZeroconfDiscoveryInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ZeroconfDiscoveryInfoDialogParams;

  @state() private _open = false;

  public async showDialog(
    params: ZeroconfDiscoveryInfoDialogParams
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
          "ui.panel.config.zeroconf.discovery_information"
        )}
        @closed=${this._dialogClosed}
      >
        <p>
          <b>${this.hass.localize("ui.panel.config.zeroconf.name")}</b>:
          ${this._params.entry.name.slice(
            0,
            -this._params.entry.type.length - 1
          )}
          <br />
          <b>${this.hass.localize("ui.panel.config.zeroconf.type")}</b>:
          ${this._params.entry.type}
          <br />
          <b>${this.hass.localize("ui.panel.config.zeroconf.port")}</b>:
          ${this._params.entry.port}
          <br />
        </p>

        <h4>${this.hass.localize("ui.panel.config.zeroconf.ip_addresses")}</h4>
        <table width="100%">
          <tbody>
            ${this._params.entry.ip_addresses.map(
              (ipAddress) => html`
                <tr>
                  <td>${ipAddress}</td>
                </tr>
              `
            )}
          </tbody>
        </table>

        <h4>${this.hass.localize("ui.panel.config.zeroconf.properties")}</h4>
        <table width="100%">
          <tbody>
            ${Object.entries(this._params.entry.properties).map(
              ([key, value]) => html`
                <tr>
                  <td><b>${key}</b></td>
                  <td>${value}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="primaryAction"
            appearance="plain"
            @click=${this._copyToClipboard}
          >
            ${this.hass.localize("ui.panel.config.zeroconf.copy_to_clipboard")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zeroconf-device-info": DialogZeroconfDiscoveryInfo;
  }
}
