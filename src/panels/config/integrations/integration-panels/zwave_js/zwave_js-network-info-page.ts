import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/list/ha-list-base";
import type { ZWaveJSNetwork } from "../../../../../data/zwave_js";
import { fetchZwaveNetworkStatus } from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { formatHomeIdAsHex } from "./functions";

@customElement("zwave_js-network-info-page")
class ZWaveJSNetworkInfoPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _network?: ZWaveJSNetwork;

  protected async firstUpdated() {
    if (this.hass && this.configEntryId) {
      this._network = await fetchZwaveNetworkStatus(this.hass.connection, {
        entry_id: this.configEntryId,
      });
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.network_info_title"
        )}
        back-path="/config/zwave_js/dashboard?config_entry=${
          this.configEntryId
        }"
      >
        <div class="container">
          <ha-card>
            ${
              this._network
                ? html`<ha-list-base>
                    <ha-list-item-base>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.dashboard.home_id"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${formatHomeIdAsHex(this._network.controller.home_id)}
                      </span>
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.dashboard.driver_version"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this._network.client.driver_version}
                      </span>
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.dashboard.server_version"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this._network.client.server_version}
                      </span>
                    </ha-list-item-base>
                    <ha-list-item-base>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.dashboard.server_url"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this._network.client.ws_server_url}
                      </span>
                    </ha-list-item-base>
                  </ha-list-base>`
                : nothing
            }
          </ha-card>
        </div>
      </hass-subpage>
    `;
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
    "zwave_js-network-info-page": ZWaveJSNetworkInfoPage;
  }
}
