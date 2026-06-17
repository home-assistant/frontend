import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import { navigate } from "../../../../../common/navigate";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-relative-time";
import type { InfraredDevice } from "../../../../../data/infrared";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

interface InfraredDeviceRow extends InfraredDevice {
  type_label: string;
}

@customElement("infrared-devices-page")
export class InfraredDevicesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public devices: InfraredDevice[] = [];

  private _tabs: PageNavigation[] = [
    {
      translationKey: "ui.panel.config.infrared.devices_navigation",
      path: "/config/infrared/devices",
    },
  ];

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<InfraredDeviceRow> => ({
      name: {
        title: localize("ui.panel.config.infrared.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        direction: "asc",
      },
      type_label: {
        title: localize("ui.panel.config.infrared.type"),
        sortable: true,
        filterable: true,
        groupable: true,
      },
      last_used: {
        title: localize("ui.panel.config.infrared.last_used"),
        sortable: true,
        template: (device) =>
          device.last_used
            ? html`<ha-relative-time
                .hass=${this.hass}
                .datetime=${device.last_used}
                capitalize
              ></ha-relative-time>`
            : "—",
      },
    })
  );

  private _data = memoizeOne(
    (devices: InfraredDevice[], localize: LocalizeFunc): InfraredDeviceRow[] =>
      devices.map((device) => ({
        ...device,
        type_label: localize(`ui.panel.config.infrared.type_${device.type}`),
      }))
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${this._tabs}
        back-path="/config/infrared"
        clickable
        .columns=${this._columns(this.hass.localize)}
        .data=${this._data(this.devices, this.hass.localize)}
        .noDataText=${this.hass.localize("ui.panel.config.infrared.no_devices")}
        @row-click=${this._handleRowClicked}
      ></hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const deviceId = ev.detail.id;
    if (this.hass.devices[deviceId]) {
      navigate(`/config/devices/device/${deviceId}`);
    }
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "infrared-devices-page": InfraredDevicesPage;
  }
}
