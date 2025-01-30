import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import type {
  BluetoothDeviceData,
  BluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothAdvertisements,
  subscribeBluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { showBluetoothDeviceInfoDialog } from "./show-dialog-bluetooth-device-info";

@customElement("bluetooth-advertisement-monitor")
export class BluetoothAdvertisementMonitorPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: BluetoothDeviceData[] = [];

  @state() private _scanners: BluetoothScannersDetails = {};

  @state() private _sourceDevices: Record<string, DeviceRegistryEntry> = {};

  @storage({
    key: "bluetooth-advertisement-table-grouping",
    state: false,
    subscribe: false,
  })
  private _activeGrouping?: string = "source";

  @storage({
    key: "bluetooth-advertisement-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  private _unsub_advertisements?: UnsubscribeFunc;

  private _unsub_scanners?: UnsubscribeFunc;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._unsub_advertisements = subscribeBluetoothAdvertisements(
        this.hass.connection,
        (data) => {
          this._data = data;
        }
      );
      this._unsub_scanners = subscribeBluetoothScannersDetails(
        this.hass.connection,
        (scanners) => {
          this._scanners = scanners;
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
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub_advertisements) {
      this._unsub_advertisements();
      this._unsub_advertisements = undefined;
    }
    if (this._unsub_scanners) {
      this._unsub_scanners();
      this._unsub_scanners = undefined;
    }
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<BluetoothDeviceData> = {
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
        rssi: {
          title: localize("ui.panel.config.bluetooth.rssi"),
          type: "numeric",
          maxWidth: "60px",
          sortable: true,
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
      return {
        ...row,
        id: row.address,
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
        @row-click=${this._handleRowClicked}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        clickable
      ></hass-tabs-subpage-data-table>
    `;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const entry = this._data.find((ent) => ent.address === ev.detail.id);
    showBluetoothDeviceInfoDialog(this, {
      entry: entry!,
    });
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-advertisement-monitor": BluetoothAdvertisementMonitorPanel;
  }
}
