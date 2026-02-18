import { mdiCogOutline, mdiDevices } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
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
import {
  enableConfigEntry,
  getConfigEntries,
} from "../../../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("bluetooth-adapter-info-page")
export class BluetoothAdapterInfoPage extends LitElement {
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

  private _getBluetoothDevices() {
    const entryMap = new Map(this._configEntries.map((e) => [e.entry_id, e]));

    const enabledDevices: {
      device: DeviceRegistryEntry;
      entry: ConfigEntry;
    }[] = [];
    const disabledDevices: {
      device: DeviceRegistryEntry;
      entry: ConfigEntry;
    }[] = [];
    const matchedEntryIds = new Set<string>();

    for (const device of Object.values(this.hass.devices)) {
      const btConnection = device.connections.find((c) => c[0] === "bluetooth");
      if (!btConnection) {
        continue;
      }
      const entry = device.config_entries
        .map((id) => entryMap.get(id))
        .find((e) => e !== undefined);
      if (!entry) {
        continue;
      }
      matchedEntryIds.add(entry.entry_id);
      if (entry.disabled_by !== null) {
        disabledDevices.push({ device, entry });
      } else {
        enabledDevices.push({ device, entry });
      }
    }

    const disabledEntriesWithoutDevice = this._configEntries.filter(
      (e) => e.disabled_by !== null && !matchedEntryIds.has(e.entry_id)
    );

    return { enabledDevices, disabledDevices, disabledEntriesWithoutDevice };
  }

  protected render(): TemplateResult {
    const { enabledDevices, disabledDevices, disabledEntriesWithoutDevice } =
      this._getBluetoothDevices();

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.bluetooth.adapter_info_title"
        )}
        back-path="/config/bluetooth/dashboard"
      >
        <div class="container">
          <ha-card>
            <ha-md-list>
              ${this._renderAdaptersList(enabledDevices)}
              ${disabledDevices.map(
                ({ device, entry }) => html`
                  <ha-md-list-item class="disabled">
                    <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
                    <div slot="headline">
                      ${computeDeviceName(device) || entry.title}
                    </div>
                    ${device.area_id && this.hass.areas[device.area_id]
                      ? html`<div slot="supporting-text">
                          ${this.hass.areas[device.area_id].name}
                        </div>`
                      : nothing}
                    <ha-button
                      slot="end"
                      .entry=${entry}
                      @click=${this._handleEnable}
                    >
                      ${this.hass.localize("ui.common.enable")}
                    </ha-button>
                  </ha-md-list-item>
                `
              )}
              ${disabledEntriesWithoutDevice.map(
                (entry) => html`
                  <ha-md-list-item class="disabled">
                    <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
                    <div slot="headline">${entry.title}</div>
                    <ha-button
                      slot="end"
                      .entry=${entry}
                      @click=${this._handleEnable}
                    >
                      ${this.hass.localize("ui.common.enable")}
                    </ha-button>
                  </ha-md-list-item>
                `
              )}
            </ha-md-list>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _renderAdaptersList(
    devices: { device: DeviceRegistryEntry; entry: ConfigEntry }[]
  ) {
    if (devices.length === 0) {
      return html`<ha-md-list-item>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.bluetooth.no_scanner_state_available"
          )}
        </div>
      </ha-md-list-item>`;
    }

    return devices.map(({ device, entry }) => {
      const btConnection = device.connections.find((c) => c[0] === "bluetooth");
      const btAddress = btConnection?.[1];

      const scannerDetails =
        btAddress && this._scannerDetails
          ? Object.values(this._scannerDetails).find(
              (d) => d.source === btAddress
            )
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

      const allocations = scannerDetails
        ? this._connectionAllocationData.find(
            (a) => a.source === scannerDetails.source
          )
        : undefined;

      const deviceName = computeDeviceName(device) || entry.title;
      const areaName = device.area_id
        ? this.hass.areas[device.area_id]?.name
        : undefined;
      const modeText = this._formatScannerModeText(scannerState);
      const connectionText = allocations
        ? allocations.slots > 0
          ? `${allocations.slots - allocations.free}/${allocations.slots} ${this.hass.localize("ui.panel.config.bluetooth.active_connections")}`
          : this.hass.localize("ui.panel.config.bluetooth.no_connection_slots")
        : undefined;

      const supportingParts = [areaName, modeText, connectionText].filter(
        Boolean
      );

      return html`
        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
          <div slot="headline">${deviceName}</div>
          <div slot="supporting-text">${supportingParts.join(" · ")}</div>
          ${!isRemoteScanner
            ? html`<ha-icon-button
                slot="end"
                .path=${mdiCogOutline}
                .entry=${entry}
                @click=${this._openOptionFlow}
                .label=${this.hass.localize(
                  "ui.panel.config.bluetooth.option_flow"
                )}
              ></ha-icon-button>`
            : nothing}
        </ha-md-list-item>
        ${hasMismatch && scannerDetails
          ? this._renderScannerMismatchWarning(
              deviceName,
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

  private async _handleEnable(ev: Event) {
    const button = ev.currentTarget as HTMLElement & { entry: ConfigEntry };
    const entryId = button.entry.entry_id;
    try {
      const result = await enableConfigEntry(this.hass, entryId);
      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.integrations.config_entry.enable_restart_confirm"
          ),
        });
      }
      this._loadConfigEntries();
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
    }
  }

  private _openOptionFlow(ev: Event) {
    const button = ev.currentTarget as HTMLElement & { entry: ConfigEntry };
    showOptionsFlowDialog(this, button.entry);
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

        ha-md-list-item {
          --md-item-overflow: visible;
        }

        ha-md-list-item ha-svg-icon[slot="start"] {
          color: var(--secondary-text-color);
        }

        ha-md-list-item.disabled {
          opacity: 0.5;
        }

        ha-md-list-item.disabled ha-button {
          opacity: calc(1 / 0.5);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-adapter-info-page": BluetoothAdapterInfoPage;
  }
}
