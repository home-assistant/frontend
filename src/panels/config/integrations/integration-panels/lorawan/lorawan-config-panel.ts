import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { mdiPowerPlug, mdiPlus } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-relative-time";
import "../../../../../components/ha-svg-icon";
import type {
  LoRaWANDevice,
  LoRaWANConnection,
} from "../../../../../data/lorawan";
import {
  strongestLoRaWANReception,
  subscribeLoRaWANDevices,
} from "../../../../../data/lorawan";
import "../../../../../layouts/hass-subpage";
import { panelIsReady } from "../../../../../layouts/panel-ready";
import { loadVirtualizer } from "../../../../../resources/virtualizer";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import type { HaDropdownSelectEvent } from "../../../../../components/ha-dropdown";
import { brandsUrl } from "../../../../../util/brands-url";
import type { HomeAssistant } from "../../../../../types";
import "./lorawan-connection-link";

type DeviceRow = LoRaWANDevice & {
  id: string;
  rssi: number | null;
  connection_title: string;
};

@customElement("lorawan-config-panel")
export class LoRaWANConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @state() private _devices?: LoRaWANDevice[];
  @state() private _error = false;
  @state() private _connections: LoRaWANConnection[] = [];

  private _unsubscribe?: Promise<UnsubscribeFunc>;

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this._subscribe();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.then((unsubscribe) => unsubscribe());
    this._unsubscribe = undefined;
  }

  protected firstUpdated() {
    this._subscribe();
  }

  private _subscribe() {
    this._error = false;
    this._unsubscribe = loadVirtualizer()
      .then(() =>
        subscribeLoRaWANDevices(
          this.hass.connection,
          ({ devices, connections }) => {
            this._devices = devices;
            this._connections = connections;
            panelIsReady(this);
          }
        )
      )
      .catch(() => {
        this._error = true;
        panelIsReady(this);
        return () => undefined;
      });
  }

  private _columns(): DataTableColumnContainer<DeviceRow> {
    return {
      name: {
        title: this.hass.localize("ui.panel.config.lorawan.device"),
        main: true,
        showNarrow: true,
        filterable: true,
        sortable: true,
        flex: 2,
        minWidth: "220px",
        template: (device) =>
          html`<div>
            <div class="primary">${device.name || device.dev_eui}</div>
            <div class="secondary">
              ${[device.manufacturer, device.model].filter(Boolean).join(" · ") || device.dev_eui}
            </div>
            ${
              this.narrow
                ? html`<lorawan-connection-link
                      .connection=${device.connection}
                    ></lorawan-connection-link>
                    <div class="secondary">
                      ${this._time(device.last_uplink)} ·
                      ${device.rssi === null ? "—" : `${device.rssi} dBm`}
                    </div>`
                : nothing
            }
          </div>`,
      },
      connection_title: {
        hidden: this.narrow,
        title: this.hass.localize("ui.panel.config.lorawan.connection"),
        filterable: true,
        sortable: true,
        minWidth: "210px",
        flex: 1.5,
        template: (device) =>
          html`<lorawan-connection-link
            .connection=${device.connection}
          ></lorawan-connection-link>`,
      },
      last_uplink: {
        hidden: this.narrow,
        title: this.hass.localize("ui.panel.config.lorawan.last_uplink"),
        sortable: true,
        minWidth: "150px",
        template: (device) => this._time(device.last_uplink),
      },
      rssi: {
        hidden: this.narrow,
        title: this.hass.localize("ui.panel.config.lorawan.rssi"),
        sortable: true,
        type: "numeric",
        minWidth: "90px",
        maxWidth: "110px",
        template: (device) =>
          device.rssi === null ? "—" : `${device.rssi} dBm`,
      },
      battery_level: {
        title: this.hass.localize("ui.panel.config.lorawan.battery"),
        showNarrow: true,
        sortable: true,
        type: "numeric",
        minWidth: "75px",
        maxWidth: "100px",
        template: (device) =>
          device.external_power_source
            ? html`<ha-svg-icon
                .path=${mdiPowerPlug}
                aria-label=${this.hass.localize("ui.panel.config.lorawan.external_power")}
                title=${this.hass.localize("ui.panel.config.lorawan.external_power")}
              ></ha-svg-icon>`
            : device.battery_level === null
              ? "—"
              : `${Math.round(device.battery_level)}%`,
      },
    };
  }

  private _time(timestamp: string | null) {
    return timestamp
      ? html`<ha-relative-time
          .datetime=${timestamp}
          title=${timestamp}
        ></ha-relative-time>`
      : this.hass.localize("ui.panel.config.lorawan.not_observed");
  }

  protected render() {
    const rows =
      this._devices?.map((device): DeviceRow => ({
        ...device,
        id: `${device.connection.entry_id}:${device.dev_eui}`,
        rssi: strongestLoRaWANReception(device.receptions)?.rssi ?? null,
        connection_title: device.connection.title,
      })) ?? [];
    return html`<hass-subpage
      .hass=${this.hass}
      .narrow=${this.narrow}
      .header=${this.hass.localize("ui.panel.config.lorawan.title")}
      .scrollable=${false}
      back-path="/config/connectivity"
    >
      ${this._renderAddDevice()}
      <ha-data-table
        .columns=${this._columns()}
        .data=${rows}
        .narrow=${this.narrow}
        .loading=${this._devices === undefined && !this._error}
        .loadError=${this._error}
        .noDataText=${this.hass.localize("ui.panel.config.lorawan.no_devices")}
        .searchLabel=${this.hass.localize("ui.panel.config.lorawan.search")}
        clickable
        @row-click=${this._rowClicked}
        @retry-load=${this._subscribe}
      ></ha-data-table>
    </hass-subpage>`;
  }

  private _renderAddDevice() {
    const connections = this._connections.filter(
      (connection) => connection.configuration_url
    );
    if (!connections.length) return nothing;
    if (connections.length === 1) {
      return html`<ha-button
        slot="toolbar-icon"
        href=${connections[0].configuration_url!}
        target="_blank"
        rel="noopener noreferrer"
        ><ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon
        >${this.hass.localize("ui.panel.config.lorawan.add_device")}</ha-button
      >`;
    }
    return html`<ha-dropdown slot="toolbar-icon" @wa-select=${this._addDevice}>
      <ha-button slot="trigger"
        ><ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon
        >${this.hass.localize("ui.panel.config.lorawan.add_device")}</ha-button
      >
      ${connections.map((connection) => html`<ha-dropdown-item .value=${connection.configuration_url!}><img slot="icon" alt="" width="24" height="24" src=${brandsUrl({ domain: connection.domain, type: "icon", darkOptimized: this.hass.themes.darkMode }, this.hass.hassUrl())} />${connection.title}</ha-dropdown-item>`)}
    </ha-dropdown>`;
  }

  private _addDevice(ev: HaDropdownSelectEvent) {
    window.open(ev.detail.item.value, "_blank", "noopener,noreferrer");
  }

  private _rowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const device = this._devices!.find(
      (candidate) =>
        `${candidate.connection.entry_id}:${candidate.dev_eui}` === ev.detail.id
    )!;
    if (device.device_id) {
      navigate(`/config/devices/device/${device.device_id}`);
      return;
    }
    fireEvent(this, "show-dialog", {
      dialogTag: "dialog-lorawan-device",
      dialogImport: () => import("./dialog-lorawan-device"),
      dialogParams: { device },
    });
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    ha-data-table {
      display: block;
      --data-table-row-height: 72px;
    }
    @media (max-width: 600px) {
      ha-data-table {
        --data-table-row-height: 132px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-config-panel": LoRaWANConfigPanel;
  }
}
