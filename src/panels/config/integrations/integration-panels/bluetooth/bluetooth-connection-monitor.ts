import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../../../common/decorators/storage";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-relative-time";
import type {
  BluetoothScannersDetails,
  BluetoothConnectionData,
  BluetoothAllocationsData,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothScannersDetails,
  subscribeBluetoothConnectionAllocations,
  subscribeBluetoothAdvertisements,
} from "../../../../../data/bluetooth";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../../../components/ha-metric";

@customElement("bluetooth-connection-monitor")
export class BluetoothConnectionMonitorPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: BluetoothConnectionData[] = [];

  @state() private _scanners: BluetoothScannersDetails = {};

  @state() private _addressNames: Record<string, string> = {};

  @state() private _sourceDevices: Record<string, DeviceRegistryEntry> = {};

  @storage({
    key: "bluetooth-connection-table-grouping",
    state: false,
    subscribe: false,
  })
  private _activeGrouping?: string = "source";

  @storage({
    key: "bluetooth-connection-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  private _unsubConnectionAllocations?: (() => Promise<void>) | undefined;

  private _unsubScanners?: UnsubscribeFunc;

  private _unsub_advertisements?: UnsubscribeFunc;

  @state() private _connectionAllocationData: Record<
    string,
    BluetoothAllocationsData
  > = {};

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._unsubScanners = subscribeBluetoothScannersDetails(
        this.hass.connection,
        (scanners) => {
          this._scanners = scanners;
        }
      );
      this._unsub_advertisements = subscribeBluetoothAdvertisements(
        this.hass.connection,
        (data) => {
          for (const device of data) {
            this._addressNames[device.address] = device.name;
          }
        }
      );
      const devices = Object.values(this.hass.devices);
      const bluetoothDevices = devices.filter((device) =>
        device.connections.find((connection) => connection[0] === "bluetooth")
      );
      this._sourceDevices = Object.fromEntries(
        bluetoothDevices.map((device) => {
          const connection = device.connections.find(
            (c) => c[0] === "bluetooth"
          )!;
          return [connection[1], device];
        })
      );
      this._subscribeBluetoothConnectionAllocations();
    }
  }

  private async _subscribeBluetoothConnectionAllocations(): Promise<void> {
    if (this._unsubConnectionAllocations) {
      return;
    }
    this._unsubConnectionAllocations =
      await subscribeBluetoothConnectionAllocations(
        this.hass.connection,
        (data) => {
          for (const allocation of data) {
            this._connectionAllocationData[allocation.source] = allocation;
          }
          const newData: BluetoothConnectionData[] = [];
          for (const allocation of Object.values(
            this._connectionAllocationData
          )) {
            for (const address of allocation.allocated) {
              newData.push({
                address: address,
                source: allocation.source,
              });
            }
          }
          this._data = newData;
        }
      );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub_advertisements) {
      this._unsub_advertisements();
      this._unsub_advertisements = undefined;
    }
    if (this._unsubConnectionAllocations) {
      this._unsubConnectionAllocations();
      this._unsubConnectionAllocations = undefined;
    }
    if (this._unsubScanners) {
      this._unsubScanners();
      this._unsubScanners = undefined;
    }
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<BluetoothConnectionData> = {
        address: {
          title: localize("ui.panel.config.bluetooth.address"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          main: true,
          hideable: false,
          moveable: false,
          direction: "asc",
          flex: 1,
        },
        name: {
          title: localize("ui.panel.config.bluetooth.name"),
          filterable: true,
          sortable: true,
        },
        device: {
          title: localize("ui.panel.config.bluetooth.device"),
          filterable: true,
          sortable: true,
          template: (data) => html`${data.device || "-"}`,
        },
        source: {
          title: localize("ui.panel.config.bluetooth.source"),
          filterable: true,
          sortable: true,
          groupable: true,
        },
        source_address: {
          title: localize("ui.panel.config.bluetooth.source_address"),
          filterable: true,
          sortable: true,
          defaultHidden: true,
        },
      };

      return columns;
    }
  );

  private _dataWithNamedSourceAndIds = memoizeOne((data) =>
    data.map((row) => {
      const device = this._sourceDevices[row.address];
      const scannerDevice = this._sourceDevices[row.source];
      const scanner = this._scanners[row.source];
      const name = this._addressNames[row.address] || row.address;
      return {
        ...row,
        id: row.address,
        name: name,
        source_address: row.source,
        source:
          scannerDevice?.name_by_user ||
          scannerDevice?.name ||
          scanner?.name ||
          row.source,
        device: device?.name_by_user || device?.name || undefined,
      };
    })
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._dataWithNamedSourceAndIds(this._data)}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .noDataText=${this.hass.localize(
          "ui.panel.config.bluetooth.no_connections"
        )}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
      ></hass-tabs-subpage-data-table>
    `;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-connection-monitor": BluetoothConnectionMonitorPanel;
  }
}
