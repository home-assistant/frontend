import {
  mdiAccessPoint,
  mdiBroadcast,
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiLan,
  mdiLinkVariant,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type {
  BluetoothAllocationsData,
  BluetoothScannerState,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothConnectionAllocations,
  subscribeBluetoothScannerState,
} from "../../../../../data/bluetooth";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("bluetooth-config-dashboard")
export class BluetoothConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _configEntries: ConfigEntry[] = [];

  @state() private _connectionAllocationData: BluetoothAllocationsData[] = [];

  @state() private _scannerStates: Record<string, BluetoothScannerState> = {};

  private _unsubConnectionAllocations?: (() => Promise<void>) | undefined;

  private _unsubScannerState?: (() => Promise<void>) | undefined;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._loadConfigEntries();
      this._subscribeBluetoothConnectionAllocations();
      this._subscribeBluetoothScannerState();
    }
  }

  private async _loadConfigEntries(): Promise<void> {
    this._configEntries = await getConfigEntries(this.hass, {
      domain: "bluetooth",
    });
  }

  private async _subscribeBluetoothConnectionAllocations(): Promise<void> {
    if (this._unsubConnectionAllocations) {
      return;
    }
    this._unsubConnectionAllocations =
      await subscribeBluetoothConnectionAllocations(
        this.hass.connection,
        (data) => {
          this._connectionAllocationData = data;
        }
      );
  }

  private async _subscribeBluetoothScannerState(): Promise<void> {
    if (this._unsubScannerState) {
      return;
    }
    this._unsubScannerState = await subscribeBluetoothScannerState(
      this.hass.connection,
      (scannerState) => {
        this._scannerStates = {
          ...this._scannerStates,
          [scannerState.source]: scannerState,
        };
      }
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubConnectionAllocations) {
      this._unsubConnectionAllocations();
      this._unsubConnectionAllocations = undefined;
    }
    if (this._unsubScannerState) {
      this._unsubScannerState();
      this._unsubScannerState = undefined;
    }
  }

  protected render(): TemplateResult {
    const adapterCount = this._configEntries.length;
    const totalSlots = this._connectionAllocationData.reduce(
      (sum, a) => sum + a.slots,
      0
    );
    const usedSlots = this._connectionAllocationData.reduce(
      (sum, a) => sum + (a.slots - a.free),
      0
    );
    const hasMismatch = Object.values(this._scannerStates).some(
      (s) => s.current_mode !== s.requested_mode
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.bluetooth.title")}
      >
        <div class="container">
          <ha-card class="network-status">
            <div class="card-content">
              <div class="heading">
                <div class="icon ${hasMismatch ? "warning" : "online"}">
                  <ha-svg-icon
                    .path=${hasMismatch
                      ? mdiAlertCircleOutline
                      : mdiCheckCircleOutline}
                  ></ha-svg-icon>
                </div>
                <div class="details">
                  <span class="title">
                    ${this.hass.localize("ui.panel.config.bluetooth.title")}
                  </span>
                  <span class="secondary">
                    ${this.hass.localize(
                      "ui.panel.config.bluetooth.adapters_count",
                      { count: adapterCount }
                    )}${totalSlots > 0
                      ? ` · ${this.hass.localize(
                          "ui.panel.config.bluetooth.connections_summary",
                          { used: usedSlots, total: totalSlots }
                        )}`
                      : nothing}
                  </span>
                </div>
              </div>
            </div>
          </ha-card>

          <ha-card>
            <ha-md-list>
              <ha-md-list-item
                type="link"
                href="/config/bluetooth/adapter-info"
              >
                <ha-svg-icon slot="start" .path=${mdiAccessPoint}></ha-svg-icon>
                <div slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.adapter_info"
                  )}
                </div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.adapter_info_description"
                  )}
                </div>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-list-item>

              <ha-md-list-item
                type="link"
                href="/config/bluetooth/advertisement-monitor"
              >
                <ha-svg-icon slot="start" .path=${mdiBroadcast}></ha-svg-icon>
                <div slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.advertisements"
                  )}
                </div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.advertisements_description"
                  )}
                </div>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-list-item>

              <ha-md-list-item
                type="link"
                href="/config/bluetooth/connection-monitor"
              >
                <ha-svg-icon slot="start" .path=${mdiLinkVariant}></ha-svg-icon>
                <div slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.connections"
                  )}
                </div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.connections_description"
                  )}
                </div>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-list-item>

              <ha-md-list-item
                type="link"
                href="/config/bluetooth/visualization"
              >
                <ha-svg-icon slot="start" .path=${mdiLan}></ha-svg-icon>
                <div slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.visualization"
                  )}
                </div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.navigation.visualization_description"
                  )}
                </div>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-list-item>
            </ha-md-list>
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
          margin: 0 auto var(--ha-space-4);
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        .network-status .heading {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
        }

        .network-status .icon ha-svg-icon {
          --mdc-icon-size: 48px;
        }

        .network-status .icon.online {
          color: var(--success-color);
        }

        .network-status .icon.warning {
          color: var(--warning-color);
        }

        .network-status .details {
          display: flex;
          flex-direction: column;
        }

        .network-status .details .title {
          font-size: var(--ha-font-size-xl);
          font-weight: 500;
        }

        .network-status .details .secondary {
          font-size: var(--ha-font-size-m);
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-config-dashboard": BluetoothConfigDashboard;
  }
}
