import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { load } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { extractSearchParamsObject } from "../../../../../common/url/search-params";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-relative-time";
import type {
  BluetoothDeviceData,
  BluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothAdvertisements,
  subscribeBluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { showBluetoothDeviceInfoDialog } from "./show-dialog-bluetooth-device-info";

export const bluetoothAdvertisementMonitorTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.bluetooth.advertisement_monitor",
    path: "advertisement-monitor",
  },
  {
    translationKey: "ui.panel.config.bluetooth.visualization",
    path: "visualization",
  },
];

@customElement("bluetooth-advertisement-monitor")
export class BluetoothAdvertisementMonitorPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public address?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: BluetoothDeviceData[] = [];

  @state() private _scanners: BluetoothScannersDetails = {};

  @state() private _sourceDevices: Record<string, DeviceRegistryEntry> = {};

  @state() private _manufacturers: Record<string, string> = {};

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

  public firstUpdated(_changedProperties: PropertyValues): void {
    this._fetchManufacturers();
  }

  private async _fetchManufacturers() {
    const response = await fetch("/static/bluetooth_company_identifiers.yaml");
    const yamlText = await response.text();
    const data = load(yamlText) as any;

    this._manufacturers = (data.company_identifiers || []).reduce(
      (acc, entry) => {
        acc[parseInt(entry.value).toString()] = entry.name;
        return acc;
      },
      {}
    );
  }

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

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    const searchParams = extractSearchParamsObject();
    const address = searchParams.address;
    if (address) {
      this.address = address;
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
        time: {
          title: localize("ui.panel.config.bluetooth.updated"),
          filterable: false,
          sortable: true,
          defaultHidden: false,
          template: (ad) =>
            html`<ha-relative-time
              .hass=${this.hass}
              .datetime=${ad.datetime}
              capitalize
            ></ha-relative-time>`,
        },
        rssi: {
          title: localize("ui.panel.config.bluetooth.rssi"),
          type: "numeric",
          maxWidth: "60px",
          sortable: true,
        },
        manufacturer: {
          title: localize("ui.panel.config.bluetooth.manufacturer"),
          filterable: true,
          sortable: true,
          defaultHidden: true,
        },
      };

      return columns;
    }
  );

  private _dataWithNamedSourceAndIds = memoizeOne((data, manufacturers) =>
    data.map((row) => {
      const device = this._sourceDevices[row.address];
      const scannerDevice = this._sourceDevices[row.source];
      const scanner = this._scanners[row.source];
      const manufacturerCode = Object.keys(row.manufacturer_data)?.[0];

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
        datetime: new Date(row.time * 1000),
        manufacturer: manufacturerCode
          ? manufacturers[manufacturerCode]
          : undefined,
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
        .data=${this._dataWithNamedSourceAndIds(
          this._data,
          this._manufacturers
        )}
        .noDataText=${this.hass.localize(
          "ui.panel.config.bluetooth.no_advertisements_found"
        )}
        @row-click=${this._handleRowClicked}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        filter=${this.address || ""}
        clickable
        .tabs=${bluetoothAdvertisementMonitorTabs}
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
      manufacturers: this._manufacturers,
    });
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-advertisement-monitor": BluetoothAdvertisementMonitorPanel;
  }
}
