import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
  customElement,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import { HomeAssistant, Route } from "../../../types";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
} from "../../../data/area_registry";
import "../../../components/ha-fab";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import "../ha-config-section";
import {
  showAreaRegistryDetailDialog,
  loadAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import { configSections } from "../ha-panel-config";
import memoizeOne from "memoize-one";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import {
  devicesInArea,
  DeviceRegistryEntry,
} from "../../../data/device_registry";
import { navigate } from "../../../common/navigate";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() public areas!: AreaRegistryEntry[];
  @property() public devices!: DeviceRegistryEntry[];

  private _areas = memoizeOne(
    (areas: AreaRegistryEntry[], devices: DeviceRegistryEntry[]) => {
      return areas.map((area) => {
        return {
          ...area,
          devices: devicesInArea(devices, area.area_id).length,
        };
      });
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: this.hass.localize(
                "ui.panel.config.areas.data_table.area"
              ),
              sortable: true,
              filterable: true,
              grows: true,
              direction: "asc",
            },
          }
        : {
            name: {
              title: this.hass.localize(
                "ui.panel.config.areas.data_table.area"
              ),
              sortable: true,
              filterable: true,
              grows: true,
              direction: "asc",
            },
            devices: {
              title: this.hass.localize(
                "ui.panel.config.areas.data_table.devices"
              ),
              sortable: true,
              type: "numeric",
              width: "20%",
              direction: "asc",
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .tabs=${configSections.integrations}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._areas(this.areas, this.devices)}
        @row-click=${this._handleRowClicked}
        .noDataText=${this.hass.localize(
          "ui.panel.config.areas.picker.no_areas"
        )}
        id="area_id"
      >
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:help-circle"
          @click=${this._showHelp}
        ></paper-icon-button>
      </hass-tabs-subpage-data-table>
      <ha-fab
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        icon="hass:plus"
        title="${this.hass.localize(
          "ui.panel.config.areas.picker.create_area"
        )}"
        @click=${this._createArea}
      ></ha-fab>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadAreaRegistryDetailDialog();
  }

  private _createArea() {
    this._openDialog();
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.areas.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.areas.picker.introduction")}
        <p>
          ${this.hass.localize("ui.panel.config.areas.picker.introduction2")}
        </p>
        <a href="/config/integrations/dashboard">
          ${this.hass.localize(
            "ui.panel.config.areas.picker.integrations_page"
          )}
        </a>
      `,
    });
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const areaId = ev.detail.id;
    navigate(this, `/config/areas/area/${areaId}`);
  }

  private _openDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) =>
        createAreaRegistryEntry(this.hass!, values),
    });
  }

  static get styles(): CSSResult {
    return css`
      hass-loading-screen {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
      }
      ha-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }
      ha-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
      ha-fab[narrow] {
        bottom: 84px;
      }
      ha-fab.rtl {
        right: auto;
        left: 16px;
      }

      ha-fab[is-wide].rtl {
        bottom: 24px;
        right: auto;
        left: 24px;
      }
    `;
  }
}
