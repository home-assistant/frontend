import { mdiDevices } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { sortZHADevices } from "./functions";

const devicesTab: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zha.devices.caption",
    path: "/config/zha/devices",
    iconPath: mdiDevices,
  },
];

interface DeviceRowData {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  available: boolean;
  ieee: string;
}

@customElement("zha-devices-dashboard")
export class ZHADevicesDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _devices: ZHADevice[] = [];

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchDevices();
    }
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<DeviceRowData> => ({
      name: {
        title: localize("ui.panel.config.zha.devices.columns.name"),
        sortable: true,
        filterable: true,
        showNarrow: true,
        main: true,
        hideable: false,
        moveable: false,
        direction: "asc",
        flex: 2,
      },
      manufacturer: {
        title: localize("ui.panel.config.zha.devices.columns.manufacturer"),
        sortable: true,
        filterable: true,
      },
      model: {
        title: localize("ui.panel.config.zha.devices.columns.model"),
        sortable: true,
        filterable: true,
      },
      available: {
        title: localize("ui.panel.config.zha.devices.columns.available"),
        sortable: true,
        template: (device) =>
          device.available
            ? html`${localize("ui.panel.config.zha.devices.filter.available")}`
            : html`${localize("ui.panel.config.zha.devices.filter.unavailable")}`,
      },
    })
  );

  private _formattedDevices = memoizeOne(
    (devices: ZHADevice[]): DeviceRowData[] =>
      devices.map((d) => ({
        id: d.ieee,
        name: d.user_given_name ?? d.name,
        manufacturer: d.manufacturer,
        model: d.model,
        available: d.available,
        ieee: d.ieee,
      }))
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .tabs=${devicesTab}
        back-path="/config/zha/dashboard"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._formattedDevices(this._devices)}
        @row-click=${this._handleRowClicked}
        clickable
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _fetchDevices(): Promise<void> {
    try {
      this._devices = (await fetchDevices(this.hass!)).sort(sortZHADevices);
    } catch (err: any) {
      showAlertDialog(this, {
        text: this.hass.localize("ui.panel.config.zha.devices.fetch_error", {
          reason: err.message || err,
        }),
      });
    }
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>): void {
    const device = this._devices.find((d) => d.ieee === ev.detail.id);
    if (device) {
      navigate(`/config/devices/device/${device.device_reg_id}`);
    }
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-devices-dashboard": ZHADevicesDashboard;
  }
}
