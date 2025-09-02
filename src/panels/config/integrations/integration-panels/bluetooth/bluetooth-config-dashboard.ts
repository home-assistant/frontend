import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-switch";
import "../../../../../components/ha-button";
import { getConfigEntries } from "../../../../../data/config_entries";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import {
  subscribeBluetoothConnectionAllocations,
  subscribeBluetoothScannerState,
} from "../../../../../data/bluetooth";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../../../util/calculate";
import "../../../../../components/ha-metric";
import type {
  BluetoothAllocationsData,
  BluetoothScannerState,
} from "../../../../../data/bluetooth";

@customElement("bluetooth-config-dashboard")
export class BluetoothConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _connectionAllocationData: BluetoothAllocationsData[] = [];

  @state() private _connectionAllocationsError?: string;

  @state() private _scannerState?: BluetoothScannerState;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  private _unsubConnectionAllocations?: (() => Promise<void>) | undefined;

  private _unsubScannerState?: (() => Promise<void>) | undefined;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._subscribeBluetoothConnectionAllocations();
      this._subscribeBluetoothScannerState();
    }
  }

  private async _subscribeBluetoothConnectionAllocations(): Promise<void> {
    if (this._unsubConnectionAllocations || !this._configEntry) {
      return;
    }
    try {
      this._unsubConnectionAllocations =
        await subscribeBluetoothConnectionAllocations(
          this.hass.connection,
          (data) => {
            this._connectionAllocationData = data;
          },
          this._configEntry
        );
    } catch (err: any) {
      this._unsubConnectionAllocations = undefined;
      this._connectionAllocationsError = err.message;
    }
  }

  private async _subscribeBluetoothScannerState(): Promise<void> {
    if (this._unsubScannerState || !this._configEntry) {
      return;
    }
    this._unsubScannerState = await subscribeBluetoothScannerState(
      this.hass.connection,
      (scannerState) => {
        this._scannerState = scannerState;
      },
      this._configEntry
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
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass}>
        <div class="content">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.bluetooth.settings_title"
            )}
          >
            <div class="card-content">${this._renderScannerState()}</div>
            <div class="card-actions">
              <ha-button @click=${this._openOptionFlow}
                >${this.hass.localize(
                  "ui.panel.config.bluetooth.option_flow"
                )}</ha-button
              >
            </div>
          </ha-card>
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.bluetooth.advertisement_monitor"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.bluetooth.advertisement_monitor_details"
                )}
              </p>
            </div>
            <div class="card-actions">
              <ha-button
                href="/config/bluetooth/advertisement-monitor"
                appearance="plain"
              >
                ${this.hass.localize(
                  "ui.panel.config.bluetooth.advertisement_monitor"
                )}
              </ha-button>
              <ha-button
                href="/config/bluetooth/visualization"
                appearance="plain"
              >
                ${this.hass.localize("ui.panel.config.bluetooth.visualization")}
              </ha-button>
            </div>
          </ha-card>
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.bluetooth.connection_slot_allocations_monitor"
            )}
          >
            <div class="card-content">
              ${this._renderConnectionAllocations()}
            </div>
            <div class="card-actions">
              <ha-button
                href="/config/bluetooth/connection-monitor"
                appearance="plain"
              >
                ${this.hass.localize(
                  "ui.panel.config.bluetooth.connection_monitor"
                )}
              </ha-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _getUsedAllocations = (used: number, total: number) =>
    roundWithOneDecimal(getValueInPercentage(used, 0, total));

  private _renderScannerState() {
    if (!this._configEntry || !this._scannerState) {
      return html`<div>
        ${this.hass.localize(
          "ui.panel.config.bluetooth.no_scanner_state_available"
        )}
      </div>`;
    }

    const scannerState = this._scannerState;

    const formatMode = (mode: string | null) => {
      switch (mode) {
        case null:
          return this.hass.localize(
            "ui.panel.config.bluetooth.scanning_mode_none"
          );
        case "active":
          return this.hass.localize(
            "ui.panel.config.bluetooth.scanning_mode_active"
          );
        case "passive":
          return this.hass.localize(
            "ui.panel.config.bluetooth.scanning_mode_passive"
          );
        default:
          return mode; // Fallback for unknown modes
      }
    };

    return html`
      <div class="scanner-state">
        <div class="state-row">
          <span
            >${this.hass.localize(
              "ui.panel.config.bluetooth.current_scanning_mode"
            )}:</span
          >
          <span class="state-value"
            >${formatMode(scannerState.current_mode)}</span
          >
        </div>
        <div class="state-row">
          <span
            >${this.hass.localize(
              "ui.panel.config.bluetooth.requested_scanning_mode"
            )}:</span
          >
          <span class="state-value"
            >${formatMode(scannerState.requested_mode)}</span
          >
        </div>
        ${scannerState.current_mode !== scannerState.requested_mode
          ? html`<ha-alert alert-type="warning">
              <div>
                ${this.hass.localize(
                  "ui.panel.config.bluetooth.scanner_mode_mismatch",
                  {
                    requested: formatMode(scannerState.requested_mode),
                    current: formatMode(scannerState.current_mode),
                  }
                )}
              </div>
              <ul>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.scanner_mode_mismatch_proxy"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.scanner_mode_mismatch_usb"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.scanner_mode_mismatch_onboard"
                  )}
                </li>
              </ul>
            </ha-alert>`
          : nothing}
      </div>
    `;
  }

  private _renderConnectionAllocations() {
    if (this._connectionAllocationsError) {
      return html`<ha-alert alert-type="error"
        >${this._connectionAllocationsError}</ha-alert
      >`;
    }
    if (this._connectionAllocationData.length === 0) {
      return html`<div>
        ${this.hass.localize(
          "ui.panel.config.bluetooth.no_connection_slot_allocations"
        )}
      </div>`;
    }
    const allocations = this._connectionAllocationData[0];
    const allocationsUsed = allocations.slots - allocations.free;
    const allocationsTotal = allocations.slots;
    if (allocationsTotal === 0) {
      return html`<div>
        ${this.hass.localize(
          "ui.panel.config.bluetooth.no_active_connection_support"
        )}
      </div>`;
    }
    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.config.bluetooth.connection_slot_allocations_monitor_details",
          { slots: allocationsTotal }
        )}
      </p>
      <ha-metric
        .heading=${this.hass.localize(
          "ui.panel.config.bluetooth.used_connection_slot_allocations"
        )}
        .value=${this._getUsedAllocations(allocationsUsed, allocationsTotal)}
        .tooltip=${allocations.allocated.length > 0
          ? `${allocationsUsed}/${allocationsTotal} (${allocations.allocated.join(", ")})`
          : `${allocationsUsed}/${allocationsTotal}`}
      ></ha-metric>
    `;
  }

  private async _openOptionFlow() {
    const configEntryId = this._configEntry;
    if (!configEntryId) {
      return;
    }
    const configEntries = await getConfigEntries(this.hass, {
      domain: "bluetooth",
    });
    const configEntry = configEntries.find(
      (entry) => entry.entry_id === configEntryId
    );
    showOptionsFlowDialog(this, configEntry!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
          direction: ltr;
        }
        ha-card {
          margin-bottom: 16px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .scanner-state {
          margin-bottom: 16px;
        }
        .state-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        .state-value {
          font-weight: 500;
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
