import {
  mdiBroadcast,
  mdiCogOutline,
  mdiLan,
  mdiLinkVariant,
  mdiNetwork,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import type {
  BluetoothAllocationsData,
  BluetoothScannerState,
  BluetoothScannersDetails,
  HaScannerType,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothConnectionAllocations,
  subscribeBluetoothScannerState,
  subscribeBluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

export const bluetoothTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.bluetooth.tabs.overview",
    path: `/config/bluetooth/dashboard`,
    iconPath: mdiNetwork,
  },
  {
    translationKey: "ui.panel.config.bluetooth.tabs.advertisements",
    path: `/config/bluetooth/advertisement-monitor`,
    iconPath: mdiBroadcast,
  },
  {
    translationKey: "ui.panel.config.bluetooth.tabs.visualization",
    path: `/config/bluetooth/visualization`,
    iconPath: mdiLan,
  },
  {
    translationKey: "ui.panel.config.bluetooth.tabs.connections",
    path: `/config/bluetooth/connection-monitor`,
    iconPath: mdiLinkVariant,
  },
];

@customElement("bluetooth-config-dashboard")
export class BluetoothConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _configEntries: ConfigEntry[] = [];

  @state() private _connectionAllocationData: BluetoothAllocationsData[] = [];

  @state() private _scannerStates: Record<string, BluetoothScannerState> = {};

  @state() private _scannerDetails?: BluetoothScannersDetails;

  private _unsubConnectionAllocations?: (() => Promise<void>) | undefined;

  private _unsubScannerState?: (() => Promise<void>) | undefined;

  private _unsubScannerDetails?: (() => void) | undefined;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._loadConfigEntries();
      this._subscribeBluetoothConnectionAllocations();
      this._subscribeBluetoothScannerState();
      this._subscribeScannerDetails();
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

  private _subscribeScannerDetails(): void {
    if (this._unsubScannerDetails) {
      return;
    }
    this._unsubScannerDetails = subscribeBluetoothScannersDetails(
      this.hass.connection,
      (details) => {
        this._scannerDetails = details;
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
    if (this._unsubScannerDetails) {
      this._unsubScannerDetails();
      this._unsubScannerDetails = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        header=${this.hass.localize("ui.panel.config.bluetooth.title")}
        .narrow=${this.narrow}
        .hass=${this.hass}
        .route=${this.route}
        .tabs=${bluetoothTabs}
      >
        <div class="content">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.bluetooth.settings_title"
            )}
          >
            <ha-list>${this._renderAdaptersList()}</ha-list>
          </ha-card>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _renderAdaptersList() {
    if (this._configEntries.length === 0) {
      return html`<ha-list-item noninteractive>
        ${this.hass.localize(
          "ui.panel.config.bluetooth.no_scanner_state_available"
        )}
      </ha-list-item>`;
    }

    // Build source to device mapping (same as visualization)
    const sourceDevices: Record<string, DeviceRegistryEntry> = {};
    Object.values(this.hass.devices).forEach((device) => {
      const btConnection = device.connections.find(
        (connection) => connection[0] === "bluetooth"
      );
      if (btConnection) {
        sourceDevices[btConnection[1]] = device;
      }
    });

    return this._configEntries.map((entry) => {
      // Find scanner by matching device's config_entries to this entry
      const scannerDetails = this._scannerDetails
        ? Object.values(this._scannerDetails).find((d) => {
            const device = sourceDevices[d.source];
            return device?.config_entries.includes(entry.entry_id);
          })
        : undefined;
      const scannerState = scannerDetails
        ? this._scannerStates[scannerDetails.source]
        : undefined;
      const scannerType: HaScannerType =
        scannerDetails?.scanner_type ?? "unknown";
      const isRemoteScanner = scannerType === "remote";
      const hasMismatch =
        scannerState &&
        scannerState.current_mode !== scannerState.requested_mode;

      // Find allocation data for this scanner
      const allocations = scannerDetails
        ? this._connectionAllocationData.find(
            (a) => a.source === scannerDetails.source
          )
        : undefined;

      const secondaryText = this._formatScannerModeText(scannerState);

      return html`
        <ha-list-item twoline hasMeta noninteractive>
          <span>${entry.title}</span>
          <span slot="secondary">
            ${secondaryText}${allocations
              ? allocations.slots > 0
                ? ` · ${allocations.slots - allocations.free}/${allocations.slots} ${this.hass.localize("ui.panel.config.bluetooth.active_connections")}`
                : ` · ${this.hass.localize("ui.panel.config.bluetooth.no_connection_slots")}`
              : nothing}
          </span>
          ${!isRemoteScanner
            ? html`<ha-icon-button
                slot="meta"
                .path=${mdiCogOutline}
                .entry=${entry}
                @click=${this._openOptionFlow}
                .label=${this.hass.localize(
                  "ui.panel.config.bluetooth.option_flow"
                )}
              ></ha-icon-button>`
            : nothing}
        </ha-list-item>
        ${hasMismatch && scannerDetails
          ? this._renderScannerMismatchWarning(
              entry.title,
              scannerState,
              scannerType
            )
          : nothing}
      `;
    });
  }

  private _renderScannerMismatchWarning(
    name: string,
    scannerState: BluetoothScannerState,
    scannerType: HaScannerType
  ) {
    const instructions: string[] = [];

    if (scannerType === "remote" || scannerType === "unknown") {
      instructions.push(
        this.hass.localize(
          "ui.panel.config.bluetooth.scanner_mode_mismatch_remote"
        )
      );
    }
    if (scannerType === "usb" || scannerType === "unknown") {
      instructions.push(
        this.hass.localize(
          "ui.panel.config.bluetooth.scanner_mode_mismatch_usb"
        )
      );
    }
    if (scannerType === "uart" || scannerType === "unknown") {
      instructions.push(
        this.hass.localize(
          "ui.panel.config.bluetooth.scanner_mode_mismatch_uart"
        )
      );
    }

    return html`<ha-alert alert-type="warning">
      <div>
        ${this.hass.localize(
          "ui.panel.config.bluetooth.scanner_mode_mismatch",
          {
            name: name,
            requested: this._formatMode(scannerState.requested_mode),
            current: this._formatMode(scannerState.current_mode),
          }
        )}
      </div>
      <ul>
        ${instructions.map((instruction) => html`<li>${instruction}</li>`)}
      </ul>
    </ha-alert>`;
  }

  private _formatMode(mode: string | null): string {
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
        return mode;
    }
  }

  private _formatModeLabel(mode: string | null): string {
    switch (mode) {
      case null:
        return this.hass.localize(
          "ui.panel.config.bluetooth.scanning_mode_none_label"
        );
      case "active":
        return this.hass.localize(
          "ui.panel.config.bluetooth.scanning_mode_active_label"
        );
      case "passive":
        return this.hass.localize(
          "ui.panel.config.bluetooth.scanning_mode_passive_label"
        );
      default:
        return mode;
    }
  }

  private _formatScannerModeText(
    scannerState: BluetoothScannerState | undefined
  ): string {
    if (!scannerState) {
      return this.hass.localize(
        "ui.panel.config.bluetooth.scanner_state_unknown"
      );
    }

    return this._formatModeLabel(scannerState.current_mode);
  }

  private _openOptionFlow(ev: Event) {
    const button = ev.currentTarget as HTMLElement & { entry: ConfigEntry };
    showOptionsFlowDialog(this, button.entry);
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
        }
        ha-card {
          margin-bottom: 16px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        ha-list-item {
          --mdc-list-item-meta-display: flex;
          --mdc-list-item-meta-size: 48px;
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
