import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import type {
  ZWaveJSClient,
  ZWaveJSNetwork,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveNetworkStatus,
  InclusionState,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { showZWaveJSRebuildNetworkRoutesDialog } from "./show-dialog-zwave_js-rebuild-network-routes";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";

@customElement("zwave_js-options-page")
class ZWaveJSOptionsPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _network?: ZWaveJSNetwork;

  @state() private _status?: ZWaveJSClient["state"];

  protected async firstUpdated() {
    if (this.hass && this.configEntryId) {
      const network = await fetchZwaveNetworkStatus(this.hass, {
        entry_id: this.configEntryId,
      });
      this._network = network;
      this._status = network.client.state;
    }
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.options_title"
        )}
        back-path="/config/zwave_js/dashboard?config_entry=${this
          .configEntryId}"
      >
        <div class="container">
          <ha-card>
            ${this._network
              ? html`<ha-md-list>
                  <ha-md-list-item>
                    <span slot="headline">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.rebuild_network_routes"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.rebuild_routes_description"
                      )}
                    </span>
                    <ha-button
                      appearance="plain"
                      slot="end"
                      size="small"
                      @click=${this._rebuildNetworkRoutesClicked}
                      .disabled=${this._status === "disconnected"}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.rebuild_routes_action"
                      )}
                    </ha-button>
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <span slot="headline">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.remove_node"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.remove_node_description"
                      )}
                    </span>
                    <ha-button
                      appearance="plain"
                      slot="end"
                      size="small"
                      @click=${this._removeNodeClicked}
                      .disabled=${this._status !== "connected" ||
                      (this._network?.controller.inclusion_state !==
                        InclusionState.Idle &&
                        this._network?.controller.inclusion_state !==
                          InclusionState.SmartStart)}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.remove_node_action"
                      )}
                    </ha-button>
                  </ha-md-list-item>
                </ha-md-list>`
              : nothing}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _rebuildNetworkRoutesClicked() {
    showZWaveJSRebuildNetworkRoutesDialog(this, {
      entry_id: this.configEntryId,
    });
  }

  private _removeNodeClicked() {
    showZWaveJSRemoveNodeDialog(this, {
      entryId: this.configEntryId,
      skipConfirmation:
        this._network?.controller.inclusion_state === InclusionState.Excluding,
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

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-item-overflow: visible;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-options-page": ZWaveJSOptionsPage;
  }
}
