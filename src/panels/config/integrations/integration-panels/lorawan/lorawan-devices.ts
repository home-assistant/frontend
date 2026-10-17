import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { mdiPowerPlug } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { QueryParamsController } from "../../../../../common/controllers/query-params-controller";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { navigate } from "../../../../../common/navigate";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
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
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { panelIsReady } from "../../../../../layouts/panel-ready";
import { loadVirtualizer } from "../../../../../resources/virtualizer";
import type { HomeAssistant, Route } from "../../../../../types";
import "./lorawan-connection-link";
import { connectionLabels } from "./connection-labels";

interface DeviceRow extends LoRaWANDevice, DataTableRowData {
  id: string;
  rssi: number | null;
  connection_title: string;
}

@customElement("lorawan-devices")
export class LoRaWANDevices extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ attribute: false }) public route!: Route;
  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;
  @state() private _connectionId = "";

  private _queryParams = new QueryParamsController(
    this,
    { string: ["connection"] as const },
    {
      enabled: () => true,
      navigated: () => this._readConnectionFilter(),
    }
  );

  private _tabs = [
    {
      translationKey: "ui.panel.config.lorawan.devices",
      path: "/config/lorawan/devices",
    },
  ];
  @state() private _devices?: LoRaWANDevice[];
  @state() private _error = false;
  @state() private _connections: LoRaWANConnection[] = [];

  private _unsubscribe?: Promise<UnsubscribeFunc>;

  private _connectionLabels = memoizeOne(connectionLabels);

  private _rows = memoizeOne(
    (
      devices: LoRaWANDevice[] | undefined,
      connection: string | null,
      labels: Map<string, string>
    ): DeviceRow[] =>
      (devices ?? [])
        .filter(
          (device) => !connection || device.connection.entry_id === connection
        )
        .map((device) => ({
          ...device,
          id: `${device.connection.entry_id}:${device.dev_eui}`,
          rssi: strongestLoRaWANReception(device.receptions)?.rssi ?? null,
          connection_title: labels.get(device.connection.entry_id)!,
        }))
  );

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
    this._readConnectionFilter();
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

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc,
      narrow: boolean
    ): DataTableColumnContainer<DeviceRow> => ({
      name: {
        title: localize("ui.panel.config.lorawan.device"),
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
          </div>`,
      },
      dev_eui: {
        title: localize("ui.panel.config.lorawan.dev_eui"),
        hidden: true,
        filterable: true,
      },
      connection_title: {
        groupable: true,
        urlName: "connection",
        hidden: narrow,
        title: localize("ui.panel.config.lorawan.connection"),
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
        hidden: narrow,
        title: localize("ui.panel.config.lorawan.last_uplink"),
        sortable: true,
        minWidth: "150px",
        template: (device) => this._time(device.last_uplink, localize),
      },
      rssi: {
        hidden: narrow,
        title: localize("ui.panel.config.lorawan.rssi"),
        sortable: true,
        type: "numeric",
        minWidth: "90px",
        maxWidth: "110px",
        template: (device) =>
          device.rssi === null ? "—" : `${device.rssi} dBm`,
      },
      battery_level: {
        hidden: narrow,
        title: localize("ui.panel.config.lorawan.battery"),
        sortable: true,
        type: "numeric",
        minWidth: "75px",
        maxWidth: "100px",
        template: (device) =>
          device.external_power_source
            ? html`<ha-svg-icon
                .path=${mdiPowerPlug}
                aria-label=${localize("ui.panel.config.lorawan.external_power")}
                title=${localize("ui.panel.config.lorawan.external_power")}
              ></ha-svg-icon>`
            : device.battery_level === null
              ? "—"
              : `${Math.round(device.battery_level)}%`,
      },
    })
  );

  private _time(timestamp: string | null, localize: LocalizeFunc) {
    return timestamp
      ? html`<ha-relative-time
          .datetime=${timestamp}
          title=${timestamp}
        ></ha-relative-time>`
      : localize("ui.panel.config.lorawan.not_observed");
  }

  private _readConnectionFilter() {
    this._connectionId =
      this._queryParams.searchParams()?.get("connection") ?? "";
  }

  private _connectionChanged(ev: HaSelectSelectEvent) {
    this._connectionId = ev.detail.value === "all" ? "" : ev.detail.value;
    this._queryParams.write({ connection: this._connectionId });
  }

  private _clearFilter() {
    this._connectionId = "";
    this._queryParams.write({ connection: "" });
  }

  protected render() {
    const labels = this._connectionLabels(this._connections);
    return html`<hass-tabs-subpage-data-table
      .hass=${this.hass}
      .narrow=${this.narrow}
      .isWide=${this.isWide}
      .route=${this.route}
      .tabs=${this._tabs}
      .columns=${this._columns(this.hass.localize, this.narrow)}
      .data=${this._rows(this._devices, this._connectionId, labels)}
      .loading=${this._devices === undefined && !this._error}
      .loadError=${this._error}
      .noDataText=${this.hass.localize("ui.panel.config.lorawan.no_devices")}
      .filters=${this._connectionId ? 1 : 0}
      has-filters
      sync-url
      clickable
      back-path="/config/lorawan"
      @row-click=${this._rowClicked}
      @retry-load=${this._subscribe}
      @clear-filter=${this._clearFilter}
    >
      <ha-select
        slot="filter-pane"
        .label=${this.hass.localize("ui.panel.config.lorawan.connection")}
        .value=${this._connectionId || "all"}
        .options=${[
          {
            value: "all",
            label: this.hass.localize(
              "ui.panel.config.lorawan.all_connections"
            ),
          },
          ...this._connections.map((connection) => ({
            value: connection.entry_id,
            label: labels.get(connection.entry_id)!,
          })),
        ]}
        @selected=${this._connectionChanged}
      ></ha-select>
    </hass-tabs-subpage-data-table>`;
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
    hass-tabs-subpage-data-table {
      display: block;
      --data-table-row-height: 72px;
    }
    ha-select {
      margin: var(--ha-space-4);
    }
    @media (max-width: 600px) {
      hass-tabs-subpage-data-table {
        --data-table-row-height: 132px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-devices": LoRaWANDevices;
  }
}
