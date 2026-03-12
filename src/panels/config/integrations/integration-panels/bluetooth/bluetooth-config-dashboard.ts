import {
  mdiAccessPoint,
  mdiAlertCircleOutline,
  mdiBroadcast,
  mdiCheck,
  mdiCloseCircleOutline,
  mdiLinkVariant,
  mdiVectorPolyline,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type {
  BluetoothAllocationsData,
  BluetoothDeviceData,
  BluetoothScannerState,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothAdvertisements,
  subscribeBluetoothConnectionAllocations,
  subscribeBluetoothScannerState,
} from "../../../../../data/bluetooth";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

@customElement("bluetooth-config-dashboard")
export class BluetoothConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _configEntries: ConfigEntry[] = [];

  @state() private _connectionAllocationData: BluetoothAllocationsData[] = [];

  @state() private _scannerStates: Record<string, BluetoothScannerState> = {};

  @state() private _advertisementData: BluetoothDeviceData[] = [];

  private _unsubConnectionAllocations?: (() => Promise<void>) | undefined;

  private _unsubScannerState?: (() => Promise<void>) | undefined;

  private _unsubAdvertisements?: UnsubscribeFunc;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._loadConfigEntries();
      this._subscribeBluetoothConnectionAllocations();
      this._subscribeBluetoothScannerState();
      this._subscribeBluetoothAdvertisements();
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

  private _subscribeBluetoothAdvertisements(): void {
    if (this._unsubAdvertisements) {
      return;
    }
    this._unsubAdvertisements = subscribeBluetoothAdvertisements(
      this.hass.connection,
      (data) => {
        this._advertisementData = data;
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
    if (this._unsubAdvertisements) {
      this._unsubAdvertisements();
      this._unsubAdvertisements = undefined;
    }
  }

  protected render(): TemplateResult {
    const enabledEntries = this._configEntries.filter(
      (e) => e.disabled_by === null
    );
    const adapterCount = enabledEntries.length;
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
    const isOffline = adapterCount === 0;
    const status = isOffline ? "offline" : hasMismatch ? "warning" : "online";
    const statusIcon = isOffline
      ? mdiCloseCircleOutline
      : hasMismatch
        ? mdiAlertCircleOutline
        : mdiCheck;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.bluetooth.title")}
        back-path="/config"
      >
        <div class="container">
          <ha-card class="content network-status">
            <div class="card-content">
              <div class="heading">
                <div class="icon ${status}">
                  <ha-svg-icon .path=${statusIcon}></ha-svg-icon>
                </div>
                <div class="details">
                  ${this.hass.localize(
                    `ui.panel.config.bluetooth.status_${status}`
                  )}<br />
                  <small>
                    ${this.hass.localize(
                      "ui.panel.config.bluetooth.connections_summary",
                      { used: usedSlots, total: totalSlots }
                    )}
                  </small>
                </div>
                <img
                  class="logo"
                  alt="Bluetooth"
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  src=${brandsUrl(
                    {
                      domain: "bluetooth",
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    },
                    this.hass.auth.data.hassUrl
                  )}
                />
              </div>
            </div>
          </ha-card>

          <ha-card class="network-card">
            <div class="card-header">
              ${this.hass.localize("ui.panel.config.bluetooth.my_network")}
              <ha-button
                appearance="filled"
                href="/config/bluetooth/visualization"
              >
                <ha-svg-icon
                  slot="start"
                  .path=${mdiVectorPolyline}
                ></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.bluetooth.show_map")}
              </ha-button>
            </div>
            <div class="card-content network-card-content">
              <ha-md-list>
                <ha-md-list-item
                  type="link"
                  href="/config/bluetooth/adapter-info"
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiAccessPoint}
                  ></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.bluetooth.adapters_count",
                      { count: adapterCount }
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>

                <ha-md-list-item
                  type="link"
                  href="/config/bluetooth/connection-monitor"
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiLinkVariant}
                  ></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.bluetooth.connections_count",
                      { count: usedSlots }
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
                      "ui.panel.config.bluetooth.advertisements_count",
                      { count: this._advertisementData.length }
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>
              </ha-md-list>
            </div>
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
          margin: 0px auto var(--ha-space-4);
          max-width: 600px;
        }

        .content {
          margin-top: var(--ha-space-6);
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        .network-card {
          overflow: hidden;
        }

        .network-card .card-content {
          padding: 0;
        }

        .network-card .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: var(--ha-space-2);
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .network-status div.heading .logo {
          height: 40px;
          width: 40px;
          margin-inline-start: auto;
          object-fit: contain;
        }

        .network-status div.heading .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: var(--ha-space-10);
          height: var(--ha-space-10);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .network-status div.heading .icon.online {
          --icon-color: var(--success-color);
        }

        .network-status div.heading .icon.warning {
          --icon-color: var(--warning-color);
        }

        .network-status div.heading .icon.offline {
          --icon-color: var(--error-color);
        }

        .network-status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color, var(--primary-color));
          opacity: 0.2;
        }

        .network-status div.heading .icon ha-svg-icon {
          color: var(--icon-color, var(--primary-color));
          width: var(--ha-space-6);
          height: var(--ha-space-6);
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
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
