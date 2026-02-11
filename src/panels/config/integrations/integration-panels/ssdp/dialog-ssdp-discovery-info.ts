import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../../types";
import type { SSDPDiscoveryInfoDialogParams } from "./show-dialog-ssdp-discovery-info";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-wa-dialog";
import { showToast } from "../../../../../util/toast";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import { showSSDPRawDataDialog } from "./show-dialog-ssdp-raw-data";

@customElement("dialog-ssdp-device-info")
class DialogSSDPDiscoveryInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SSDPDiscoveryInfoDialogParams;

  @state() private _open = false;

  public async showDialog(
    params: SSDPDiscoveryInfoDialogParams
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

  private _showRawData(key: string, data: Record<string, unknown>) {
    return (e: Event) => {
      e.preventDefault();
      showSSDPRawDataDialog(this, {
        key,
        data,
      });
    };
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
          "ui.panel.config.ssdp.discovery_information"
        )}
        @closed=${this._dialogClosed}
      >
        <p>
          <b>${this.hass.localize("ui.panel.config.ssdp.name")}</b>:
          ${this._params.entry.name} <br />
          <b>${this.hass.localize("ui.panel.config.ssdp.ssdp_st")}</b>:
          ${this._params.entry.ssdp_st} <br />
          <b>${this.hass.localize("ui.panel.config.ssdp.ssdp_location")}</b>:
          ${this._params.entry.ssdp_location}
        </p>

        <h4>${this.hass.localize("ui.panel.config.ssdp.ssdp_headers")}</h4>
        <table width="100%">
          <tbody>
            ${Object.entries(this._params.entry.ssdp_headers).map(
              ([key, value]) => html`
                <tr>
                  <td><b>${key}</b></td>
                  <td>${value}</td>
                </tr>
              `
            )}
          </tbody>
        </table>

        <h4>${this.hass.localize("ui.panel.config.ssdp.upnp")}</h4>
        <table width="100%">
          <tbody>
            ${Object.entries(this._params.entry.upnp).map(
              ([key, value]) => html`
                <tr>
                  <td><b>${key}</b></td>
                  <td>
                    ${typeof value === "object" && value !== null
                      ? html`<a
                          href="#"
                          @click=${this._showRawData(
                            key,
                            value as Record<string, unknown>
                          )}
                          >${this.hass.localize(
                            "ui.panel.config.ssdp.show_raw_data"
                          )}</a
                        >`
                      : value}
                  </td>
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
            ${this.hass.localize("ui.panel.config.ssdp.copy_to_clipboard")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-ssdp-device-info": DialogSSDPDiscoveryInfo;
  }
}
