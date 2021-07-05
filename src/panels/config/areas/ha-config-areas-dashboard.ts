import { mdiPlus } from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
} from "../../../data/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @property() public areas!: AreaRegistryEntry[];

  @property() public devices!: DeviceRegistryEntry[];

  @property() public entities!: EntityRegistryEntry[];

  private _areas = memoizeOne(
    (
      areas: AreaRegistryEntry[],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryEntry[]
    ) =>
      areas.map((area) => {
        const devicesInArea = new Set();

        for (const device of devices) {
          if (device.area_id === area.area_id) {
            devicesInArea.add(device.id);
          }
        }

        let entitiesInArea = 0;

        for (const entity of entities) {
          if (
            entity.area_id
              ? entity.area_id === area.area_id
              : devicesInArea.has(entity.device_id)
          ) {
            entitiesInArea++;
          }
        }

        return {
          ...area,
          devices: devicesInArea.size,
          entities: entitiesInArea,
        };
      })
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
            entities: {
              title: this.hass.localize(
                "ui.panel.config.areas.data_table.entities"
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
        .isWide=${this.isWide}
        back-path="/config"
        .tabs=${configSections.integrations}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._areas(this.areas, this.devices, this.entities)}
        @row-click=${this._handleRowClicked}
        .noDataText=${this.hass.localize(
          "ui.panel.config.areas.picker.no_areas"
        )}
        id="area_id"
        hasFab
        clickable
      >
        <ha-icon-button
          slot="toolbar-icon"
          icon="hass:help-circle"
          @click=${this._showHelp}
        ></ha-icon-button>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.areas.picker.create_area"
          )}
          extended
          @click=${this._createArea}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
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
    navigate(`/config/areas/area/${areaId}`);
  }

  private _openDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) =>
        createAreaRegistryEntry(this.hass!, values),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      hass-loading-screen {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
      }
    `;
  }
}
