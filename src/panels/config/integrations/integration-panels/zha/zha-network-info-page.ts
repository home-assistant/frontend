import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/list/ha-list-base";
import type { ZHANetworkSettings } from "../../../../../data/zha";
import { fetchZHANetworkSettings } from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { showZHAChangeChannelDialog } from "./show-dialog-zha-change-channel";

const MULTIPROTOCOL_ADDON_URL = "socket://core-silabs-multiprotocol:9999";

@customElement("zha-network-info-page")
class ZHANetworkInfoPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _networkSettings?: ZHANetworkSettings;

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchSettings();
    }
  }

  private async _fetchSettings(): Promise<void> {
    this._networkSettings = await fetchZHANetworkSettings(this.hass!);
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zha.configuration_page.network_info_title"
        )}
        back-path="/config/zha/dashboard"
      >
        <div class="container">
          <ha-card>
            ${
              this._networkSettings
                ? html`<ha-list-base>
                    <ha-list-item-base>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.channel_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${
                          this._networkSettings.settings.network_info.channel
                        }</span
                      >
                      <ha-icon-button
                        slot="end"
                        .label=${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.change_channel"
                        )}
                        .path=${mdiPencil}
                        @click=${this._showChannelMigrationDialog}
                      ></ha-icon-button>
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline">PAN ID</span>
                      <span slot="supporting-text"
                        >${
                          this._networkSettings.settings.network_info.pan_id
                        }</span
                      >
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline">Extended PAN ID</span>
                      <span slot="supporting-text"
                        >${
                          this._networkSettings.settings.network_info
                            .extended_pan_id
                        }</span
                      >
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline">Coordinator IEEE</span>
                      <span slot="supporting-text"
                        >${this._networkSettings.settings.node_info.ieee}</span
                      >
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.radio_type"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this._networkSettings.radio_type}</span
                      >
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.serial_port"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this._networkSettings.device.path}</span
                      >
                    </ha-list-item-base>
                    ${
                      this._networkSettings.device.baudrate &&
                      !this._networkSettings.device.path.startsWith("socket://")
                        ? html`
                            <ha-list-item-base>
                              <span slot="headline"
                                >${this.hass.localize(
                                  "ui.panel.config.zha.configuration_page.baudrate"
                                )}</span
                              >
                              <span slot="supporting-text"
                                >${this._networkSettings.device.baudrate}</span
                              >
                            </ha-list-item-base>
                          `
                        : nothing
                    }
                  </ha-list-base>`
                : nothing
            }
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _showChannelMigrationDialog(): Promise<void> {
    if (this._networkSettings!.device.path === MULTIPROTOCOL_ADDON_URL) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zha.configuration_page.channel_dialog.title"
        ),
        text: this.hass.localize(
          "ui.panel.config.zha.configuration_page.channel_dialog.text"
        ),
        warning: true,
      });
      return;
    }

    showZHAChangeChannelDialog(this, {
      currentChannel: this._networkSettings!.settings.network_info.channel,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          max-width: 600px;
          margin: auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-info-page": ZHANetworkInfoPage;
  }
}
