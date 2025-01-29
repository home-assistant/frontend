import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import type {
  BluetoothDeviceData,
  BluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothAdvertisements,
  subscribeBluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import { showBluetoothDeviceInfoDialog } from "./show-dialog-bluetooth-device-info";

@customElement("bluetooth-advertisement-monitor")
export class BluetoothAdvertisementMonitorPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: BluetoothDeviceData[] = [];

  @state() private _scanners: BluetoothScannersDetails = {};

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
          flex: 2,
        },
        name: {
          title: localize("ui.panel.config.bluetooth.name"),
          filterable: true,
          sortable: true,
        },
        source: {
          title: localize("ui.panel.config.bluetooth.source"),
          filterable: true,
          sortable: true,
        },
        rssi: {
          title: localize("ui.panel.config.bluetooth.rssi"),
          type: "numeric",
          sortable: true,
        },
      };

      return columns;
    }
  );

  private _dataWithNamedSourceAndIds = memoizeOne((data) =>
    data.map((row) => ({
      ...row,
      id: row.address,
      source: this._scanners[row.source]?.name || row.source,
    }))
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
        clickable
      ></hass-tabs-subpage-data-table>
    `;
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
