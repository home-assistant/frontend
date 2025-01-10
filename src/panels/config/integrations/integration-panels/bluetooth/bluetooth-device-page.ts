import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
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
  DeviceRowData,
  EventDataMessage,
} from "../../../../../data/bluetooth";

import { subscribeBluetoothAdvertisements } from "../../../../../data/bluetooth";
import { showBluetoothDeviceInfoDialog } from "./show-dialog-bluetooth-device-info";

@customElement("bluetooth-device-page")
export class BluetoothDevicePage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _data: { [id: string]: DeviceRowData } = {};

  private _unsub?: Promise<UnsubscribeFunc>;

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._unsub = subscribeBluetoothAdvertisements(
        this.hass,
        this._handleIncomingEventDataMessage.bind(this)
      );
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._unsub = subscribeBluetoothAdvertisements(
        this.hass,
        this._handleIncomingEventDataMessage.bind(this)
      );
      this._firstUpdatedCalled = true;
    }
  }

  private _handleIncomingEventDataMessage(event: EventDataMessage) {
    if (event.add) {
      for (const device_data of event.add) {
        this._data[device_data.address] = device_data;
      }
    }
    if (event.change) {
      for (const device_data of event.change) {
        this._data[device_data.address] = device_data;
      }
    }
    if (event.remove) {
      for (const device_data of event.remove) {
        delete this._data[device_data.address];
      }
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
    }
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<DeviceRowData> = {
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

  private _dataWithIds = memoizeOne(() =>
    Object.values(this._data).map((row) => ({
      ...row,
      id: row.address,
    }))
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._dataWithIds()}
        @row-click=${this._handleRowClicked}
        clickable
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    showBluetoothDeviceInfoDialog(this, {
      entry: this._data[ev.detail.id],
    });
  }

  static get styles(): CSSResultGroup {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-device-page": BluetoothDevicePage;
  }
}
